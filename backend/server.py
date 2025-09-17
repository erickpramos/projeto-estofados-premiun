from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Create the main app without a prefix
app = FastAPI(title="Estofados Premium Outlet API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_admin: bool = False

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str
    image_url: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category_id: str
    category_name: str
    image_url: str
    images: List[str] = []
    specifications: Dict[str, Any] = {}
    in_stock: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category_id: str
    image_url: str
    images: List[str] = []
    specifications: Dict[str, Any] = {}
    in_stock: bool = True

class CartItem(BaseModel):
    product_id: str
    product_name: str
    product_image: str
    price: float
    quantity: int

class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem] = []
    total: float = 0.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    user_location: str
    rating: int = Field(ge=1, le=5)
    comment: str
    user_image: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    user_name: str
    user_location: str
    rating: int = Field(ge=1, le=5)
    comment: str
    user_image: str

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_data.password)
    user = User(**{k: v for k, v in user_dict.items() if k != 'password'})
    
    await db.users.insert_one({**user.dict(), "password": user_dict["password"]})
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

# Categories routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(length=None)
    return [Category(**category) for category in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: dict, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    category = Category(**category_data)
    await db.categories.insert_one(category.dict())
    return category

# Products routes
@api_router.get("/products", response_model=List[Product])
async def get_products(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    products = await db.products.find(query).to_list(length=None)
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get category name
    category = await db.categories.find_one({"id": product_data.category_id})
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    
    product_dict = product_data.dict()
    product_dict["category_name"] = category["name"]
    product = Product(**product_dict)
    
    await db.products.insert_one(product.dict())
    return product

# Cart routes
@api_router.get("/cart", response_model=Cart)
async def get_cart(current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        cart = Cart(user_id=current_user.id)
        await db.carts.insert_one(cart.dict())
    else:
        cart = Cart(**cart)
    return cart

@api_router.post("/cart/add")
async def add_to_cart(item_data: dict, current_user: User = Depends(get_current_user)):
    # Get product
    product = await db.products.find_one({"id": item_data["product_id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get or create cart
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        cart = Cart(user_id=current_user.id)
    else:
        cart = Cart(**cart)
    
    # Add item to cart
    cart_item = CartItem(
        product_id=product["id"],
        product_name=product["name"],
        product_image=product["image_url"],
        price=product["price"],
        quantity=item_data.get("quantity", 1)
    )
    
    # Check if item already exists
    existing_item = None
    for i, item in enumerate(cart.items):
        if item.product_id == cart_item.product_id:
            existing_item = i
            break
    
    if existing_item is not None:
        cart.items[existing_item].quantity += cart_item.quantity
    else:
        cart.items.append(cart_item)
    
    # Update total
    cart.total = sum(item.price * item.quantity for item in cart.items)
    cart.updated_at = datetime.now(timezone.utc)
    
    await db.carts.replace_one({"user_id": current_user.id}, cart.dict(), upsert=True)
    return {"message": "Item added to cart", "cart": cart}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart = Cart(**cart)
    cart.items = [item for item in cart.items if item.product_id != product_id]
    cart.total = sum(item.price * item.quantity for item in cart.items)
    cart.updated_at = datetime.now(timezone.utc)
    
    await db.carts.replace_one({"user_id": current_user.id}, cart.dict())
    return {"message": "Item removed from cart", "cart": cart}

# Reviews routes
@api_router.get("/reviews", response_model=List[Review])
async def get_reviews():
    reviews = await db.reviews.find().sort("created_at", -1).to_list(length=10)
    return [Review(**review) for review in reviews]

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    review = Review(**review_data.dict())
    await db.reviews.insert_one(review.dict())
    return review

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Initialize data
    await initialize_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

async def initialize_data():
    """Initialize categories, products and reviews if they don't exist"""
    # Check if data already exists
    existing_categories = await db.categories.count_documents({})
    if existing_categories > 0:
        return
    
    # Categories with images
    categories_data = [
        {
            "name": "Sofás",
            "slug": "sofas",
            "description": "Sofás modernos e confortáveis para sua sala",
            "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc"
        },
        {
            "name": "Poltronas",
            "slug": "poltronas",
            "description": "Poltronas decorativas e confortáveis",
            "image_url": "https://images.unsplash.com/photo-1718049719688-764249c6800d"
        },
        {
            "name": "Almofadas",
            "slug": "almofadas",
            "description": "Almofadas decorativas para todos os ambientes",
            "image_url": "https://images.unsplash.com/photo-1553114552-c4ece3a33c93"
        },
        {
            "name": "Puffs",
            "slug": "puffs",
            "description": "Puffs redondos e quadrados para decoração",
            "image_url": "https://images.unsplash.com/photo-1503278034495-2865fce44a95"
        },
        {
            "name": "Recamiers",
            "slug": "recamiers",
            "description": "Recamiers elegantes para quarto e sala",
            "image_url": "https://images.unsplash.com/photo-1733472107207-547dc85e1d31"
        },
        {
            "name": "Móveis Industriais",
            "slug": "moveis-industriais",
            "description": "Móveis industriais de ferro e madeira",
            "image_url": "https://images.unsplash.com/photo-1682718619781-252f23e21132"
        }
    ]
    
    # Insert categories
    for cat_data in categories_data:
        category = Category(**cat_data)
        await db.categories.insert_one(category.dict())
    
    # Get categories for products
    categories = await db.categories.find().to_list(length=None)
    category_map = {cat["slug"]: cat for cat in categories}
    
    # Products with real images
    products_data = [
        # Sofás
        {
            "name": "Sofá Moderno Verde",
            "description": "Sofá moderno de 3 lugares em tecido verde com pés de madeira",
            "price": 2499.90,
            "category_id": category_map["sofas"]["id"],
            "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
            "images": ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc"],
            "specifications": {"lugares": "3", "material": "Tecido", "cor": "Verde"},
            "in_stock": True
        },
        {
            "name": "Sofá Cinza com Almofadas",
            "description": "Sofá moderno cinza com almofadas decorativas incluídas",
            "price": 3299.90,
            "category_id": category_map["sofas"]["id"],
            "image_url": "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e",
            "images": ["https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e"],
            "specifications": {"lugares": "3", "material": "Tecido", "cor": "Cinza"},
            "in_stock": True
        },
        {
            "name": "Sofá Branco Clean",
            "description": "Sofá moderno branco minimalista para ambientes clean",
            "price": 2899.90,
            "category_id": category_map["sofas"]["id"],
            "image_url": "https://images.unsplash.com/photo-1603192399946-8bbb0703cfc4",
            "images": ["https://images.unsplash.com/photo-1603192399946-8bbb0703cfc4"],
            "specifications": {"lugares": "2", "material": "Courino", "cor": "Branco"},
            "in_stock": True
        },
        
        # Poltronas
        {
            "name": "Poltrona Branca Moderna",
            "description": "Par de poltronas brancas modernas para sala de estar",
            "price": 1899.90,
            "category_id": category_map["poltronas"]["id"],
            "image_url": "https://images.unsplash.com/photo-1718049719688-764249c6800d",
            "images": ["https://images.unsplash.com/photo-1718049719688-764249c6800d"],
            "specifications": {"material": "Courino", "cor": "Branco", "estilo": "Moderno"},
            "in_stock": True
        },
        {
            "name": "Poltrona Couro Marrom",
            "description": "Poltrona decorativa em couro marrom com detalhes elegantes",
            "price": 2199.90,
            "category_id": category_map["poltronas"]["id"],
            "image_url": "https://images.unsplash.com/photo-1601366533287-5ee4c763ae4e",
            "images": ["https://images.unsplash.com/photo-1601366533287-5ee4c763ae4e"],
            "specifications": {"material": "Couro", "cor": "Marrom", "estilo": "Clássico"},
            "in_stock": True
        },
        
        # Almofadas
        {
            "name": "Kit Almofadas Coloridas",
            "description": "Conjunto de 3 almofadas coloridas para decoração",
            "price": 299.90,
            "category_id": category_map["almofadas"]["id"],
            "image_url": "https://images.unsplash.com/photo-1553114552-c4ece3a33c93",
            "images": ["https://images.unsplash.com/photo-1553114552-c4ece3a33c93"],
            "specifications": {"quantidade": "3", "tamanho": "45x45cm", "material": "Algodão"},
            "in_stock": True
        },
        
        # Puffs
        {
            "name": "Puff Tricotado",
            "description": "Puff redondo tricotado para sala ou quarto",
            "price": 399.90,
            "category_id": category_map["puffs"]["id"],
            "image_url": "https://images.unsplash.com/photo-1503278034495-2865fce44a95",
            "images": ["https://images.unsplash.com/photo-1503278034495-2865fce44a95"],
            "specifications": {"formato": "Redondo", "material": "Tricô", "cor": "Bege"},
            "in_stock": True
        },
        
        # Recamiers
        {
            "name": "Recamier Colorido",
            "description": "Recamier para quarto com tecido colorido e design moderno",
            "price": 1599.90,
            "category_id": category_map["recamiers"]["id"],
            "image_url": "https://images.unsplash.com/photo-1733472107207-547dc85e1d31",
            "images": ["https://images.unsplash.com/photo-1733472107207-547dc85e1d31"],
            "specifications": {"lugares": "1", "material": "Tecido", "estilo": "Moderno"},
            "in_stock": True
        },
        
        # Móveis Industriais
        {
            "name": "Mesa Industrial Ferro e Madeira",
            "description": "Mesa de jantar industrial com estrutura de ferro e tampo de madeira",
            "price": 1899.90,
            "category_id": category_map["moveis-industriais"]["id"],
            "image_url": "https://images.unsplash.com/photo-1593022445207-836cf2396054",
            "images": ["https://images.unsplash.com/photo-1593022445207-836cf2396054"],
            "specifications": {"material": "Ferro e Madeira", "lugares": "6", "estilo": "Industrial"},
            "in_stock": True
        }
    ]
    
    # Insert products
    for prod_data in products_data:
        # Get category name
        category = await db.categories.find_one({"id": prod_data["category_id"]})
        prod_data["category_name"] = category["name"]
        product = Product(**prod_data)
        await db.products.insert_one(product.dict())
    
    # Sample reviews with real people images
    reviews_data = [
        {
            "user_name": "Mariana Silva",
            "user_location": "Copacabana, RJ",
            "rating": 5,
            "comment": "Excelente qualidade! O sofá chegou no prazo e superou minhas expectativas. Recomendo!",
            "user_image": "https://images.unsplash.com/photo-1727063453176-567739afef75"
        },
        {
            "user_name": "Carlos Mendes",
            "user_location": "Barra da Tijuca, RJ",
            "rating": 5,
            "comment": "Atendimento excepcional e produtos de primeira qualidade. Muito satisfeito!",
            "user_image": "https://images.unsplash.com/photo-1717068342949-d596a0352889"
        },
        {
            "user_name": "Ana Paula",
            "user_location": "Ipanema, RJ",
            "rating": 5,
            "comment": "A poltrona ficou perfeita na minha sala. Conforto e elegância em um só produto!",
            "user_image": "https://images.unsplash.com/photo-1720098110121-26aa70b87bfc"
        },
        {
            "user_name": "Roberto Lima",
            "user_location": "Tijuca, RJ",
            "rating": 4,
            "comment": "Ótima experiência de compra. Móveis de qualidade e entrega rápida.",
            "user_image": "https://images.pexels.com/photos/2019926/pexels-photo-2019926.jpeg"
        },
        {
            "user_name": "Julia Santos",
            "user_location": "Leblon, RJ",
            "rating": 5,
            "comment": "Amei meu novo sofá! Design moderno e muito confortável. Recomendo a todos!",
            "user_image": "https://images.unsplash.com/photo-1753161021289-1373415244b1"
        }
    ]
    
    # Insert reviews
    for review_data in reviews_data:
        review = Review(**review_data)
        await db.reviews.insert_one(review.dict())