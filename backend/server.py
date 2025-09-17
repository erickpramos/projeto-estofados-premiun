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

class ContactMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    subject: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_data.password)
    user = User(**{k: v for k, v in user_dict.items() if k != 'password'})
    
    await db.users.insert_one({**user.dict(), "password": user_dict["password"]})
    
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
    product = await db.products.find_one({"id": item_data["product_id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await db.carts.find_one({"user_id": current_user.id})
    if not cart:
        cart = Cart(user_id=current_user.id)
    else:
        cart = Cart(**cart)
    
    cart_item = CartItem(
        product_id=product["id"],
        product_name=product["name"],
        product_image=product["image_url"],
        price=product["price"],
        quantity=item_data.get("quantity", 1)
    )
    
    existing_item = None
    for i, item in enumerate(cart.items):
        if item.product_id == cart_item.product_id:
            existing_item = i
            break
    
    if existing_item is not None:
        cart.items[existing_item].quantity += cart_item.quantity
    else:
        cart.items.append(cart_item)
    
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
    reviews = await db.reviews.find().sort("created_at", -1).to_list(length=15)
    return [Review(**review) for review in reviews]

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    review = Review(**review_data.dict())
    await db.reviews.insert_one(review.dict())
    return review

# Contact form
@api_router.post("/contact")
async def send_contact_message(contact_data: dict):
    contact = ContactMessage(**contact_data)
    await db.contact_messages.insert_one(contact.dict())
    return {"message": "Message sent successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await initialize_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

async def initialize_data():
    """Initialize with COMPLETE catalog - 50+ products"""
    # ALWAYS refresh data for updates
    await db.categories.delete_many({})
    await db.products.delete_many({})
    await db.reviews.delete_many({})
    
    # 5 CATEGORIES
    categories_data = [
        {"name": "Sofás & Sofás Booth", "slug": "sofas", "description": "Sofás modernos, de canto e sofás booth para restaurantes", "image_url": "https://images.unsplash.com/photo-1549800076-831d7a97afac"},
        {"name": "Poltronas Premium", "slug": "poltronas", "description": "Poltronas decorativas e giratórias de luxo", "image_url": "https://images.unsplash.com/photo-1680773525653-f14b98e5acf6"},
        {"name": "Almofadas Decorativas", "slug": "almofadas", "description": "Almofadas elegantes para todos os ambientes", "image_url": "https://images.unsplash.com/photo-1633439446662-68e86adc2a6c"},
        {"name": "Puffs Modernos", "slug": "puffs", "description": "Puffs redondos e quadrados em materiais nobres", "image_url": "https://images.unsplash.com/photo-1560448204-603b3fc33ddc"},
        {"name": "Closet Industrial de Quarto", "slug": "closet-industrial", "description": "Closets industriais de ferro e madeira para quartos modernos", "image_url": "https://images.pexels.com/photos/33880475/pexels-photo-33880475.jpeg"}
    ]
    
    for cat_data in categories_data:
        category = Category(**cat_data)
        await db.categories.insert_one(category.dict())
    
    categories = await db.categories.find().to_list(length=None)
    category_map = {cat["slug"]: cat for cat in categories}
    
    # 50 PRODUTOS COMPLETOS - 10 por categoria
    products_data = [
        # SOFÁS & SOFÁS BOOTH (10 produtos)
        {"name": "Sofá Booth Clássico Vermelho", "description": "Sofá booth estilo americano clássico com estofado vermelho premium, estrutura reforçada e acabamento impecável. Ideal para restaurantes, lanchonetes e cafeterias que buscam criar um ambiente acolhedor e nostálgico.", "price": 3299.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.pexels.com/photos/6531775/pexels-photo-6531775.jpeg", "specifications": {"lugares": "4", "material": "Courino Premium", "cor": "Vermelho", "tipo": "Booth"}, "in_stock": True},
        {"name": "Sofá Booth Elegante Preto", "description": "Sofá booth em couro sintético preto de alta qualidade, design sofisticado e moderno. Perfeito para estabelecimentos requintados que valorizam elegância e durabilidade.", "price": 3599.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1598299827130-5aa1d5149c8d", "specifications": {"lugares": "4", "material": "Couro Sintético", "cor": "Preto", "tipo": "Booth"}, "in_stock": True},
        {"name": "Sofá Booth Vintage Marrom", "description": "Sofá booth marrom vintage com acabamento em couro envelhecido, trazendo charme retrô e conforto excepcional. Ideal para pubs, bares e restaurantes temáticos.", "price": 3399.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.pexels.com/photos/1055058/pexels-photo-1055058.jpeg", "specifications": {"lugares": "4", "material": "Couro Vintage", "cor": "Marrom", "tipo": "Booth"}, "in_stock": True},
        {"name": "Sofá Booth Moderno Verde", "description": "Sofá booth verde moderno com design contemporâneo e estofado em tecido de alta resistência. Perfeito para cafeterias, bistros e espaços gastronômicos modernos.", "price": 3499.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1659005766979-45ab682d1d0b", "specifications": {"lugares": "4", "material": "Tecido Premium", "cor": "Verde", "tipo": "Booth"}, "in_stock": True},
        {"name": "Sofá Booth Clássico Azul", "description": "Sofá booth azul com design clássico americano, estofado confortável e estrutura robusta. Uma escolha atemporal para diners e restaurantes tradicionais.", "price": 3199.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1549800076-831d7a97afac", "specifications": {"lugares": "4", "material": "Courino", "cor": "Azul", "tipo": "Booth"}, "in_stock": True},
        {"name": "Sofá Booth Premium Bege", "description": "Sofá booth bege premium com estofado ultra macio e acabamento refinado. Design neutro que se adapta a qualquer decoração, oferecendo versatilidade e sofisticação.", "price": 3799.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1632771094874-eb4eb25d105b", "specifications": {"lugares": "4", "material": "Tecido Premium", "cor": "Bege", "tipo": "Booth"}, "in_stock": True},
        {"name": "Sofá de Canto Modular Cinza", "description": "Sofá de canto modular cinza que se adapta perfeitamente ao seu espaço. Módulos reconfiguráveis, tecido premium e design contemporâneo para salas modernas.", "price": 4299.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1757416654883-c73c67b3382b", "specifications": {"lugares": "5", "material": "Tecido", "cor": "Cinza", "tipo": "Modular"}, "in_stock": True},
        {"name": "Sofá Retrátil e Reclinável Premium", "description": "Sofá retrátil e reclinável com mecanismo alemão de alta qualidade. Perfeito para momentos de relaxamento, oferece múltiplas posições de conforto e design elegante.", "price": 4799.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc", "specifications": {"lugares": "3", "material": "Couro Sintético", "cor": "Marrom", "tipo": "Retrátil"}, "in_stock": True},
        {"name": "Sofá Chesterfield Clássico", "description": "Sofá Chesterfield clássico em couro legítimo com capitonê tradicional. Uma peça atemporal que adiciona elegância e requinte a qualquer ambiente.", "price": 5299.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e", "specifications": {"lugares": "3", "material": "Couro Legítimo", "cor": "Marrom", "tipo": "Chesterfield"}, "in_stock": True},
        {"name": "Sofá Minimalista Branco", "description": "Sofá minimalista branco com linhas clean e design contemporâneo. Perfeito para ambientes modernos e clean, oferece conforto sem comprometer o estilo.", "price": 2899.90, "category_id": category_map["sofas"]["id"], "image_url": "https://images.unsplash.com/photo-1603192399946-8bbb0703cfc4", "specifications": {"lugares": "2", "material": "Courino", "cor": "Branco", "tipo": "Minimalista"}, "in_stock": True},
        
        # POLTRONAS PREMIUM (10 produtos)
        {"name": "Poltrona Executiva Couro Preto", "description": "Poltrona executiva em couro legítimo preto com base giratória cromada. Design ergonômico e luxuoso, ideal para escritórios executivos e home offices sofisticados.", "price": 2899.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1680773525653-f14b98e5acf6", "specifications": {"material": "Couro Legítimo", "cor": "Preto", "tipo": "Executiva"}, "in_stock": True},
        {"name": "Poltrona Decorativa Veludo Azul", "description": "Poltrona decorativa em veludo azul royal com pés de madeira escura. Peça statement que combina conforto e elegância, perfeita para salas de estar requintadas.", "price": 1999.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1680773525486-3313809b1a14", "specifications": {"material": "Veludo", "cor": "Azul Royal", "tipo": "Decorativa"}, "in_stock": True},
        {"name": "Poltrona Giratória Mostarda", "description": "Poltrona giratória em tecido mostarda com base metálica moderna. Design contemporâneo que adiciona cor e personalidade ao ambiente, mantendo o conforto em primeiro lugar.", "price": 1799.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1680773525468-86bc33c9ba19", "specifications": {"material": "Tecido Premium", "cor": "Mostarda", "tipo": "Giratória"}, "in_stock": True},
        {"name": "Poltrona Bergère Clássica Bege", "description": "Poltrona Bergère clássica em tecido bege com detalhes em madeira nobre. Design tradicional francês que traz sophisticação e conforto atemporais ao seu ambiente.", "price": 2599.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1680773525468-eda783c5bfe7", "specifications": {"material": "Tecido + Madeira", "cor": "Bege", "tipo": "Bergère"}, "in_stock": True},
        {"name": "Poltrona Reclinável Massage", "description": "Poltrona reclinável com função massage integrada, revestimento em couro sintético premium. Tecnologia de relaxamento com múltiplos níveis de intensidade.", "price": 3799.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.pexels.com/photos/33881482/pexels-photo-33881482.jpeg", "specifications": {"material": "Couro Sintético", "cor": "Marrom", "tipo": "Reclinável Massage"}, "in_stock": True},
        {"name": "Poltrona Egg Chair Branca", "description": "Poltrona Egg Chair branca com design icônico escandinavo. Concha envolvente que proporciona privacidade e conforto, perfeita para espaços modernos e descolados.", "price": 2299.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.pexels.com/photos/68389/pexels-photo-68389.jpeg", "specifications": {"material": "Fibra + Estofado", "cor": "Branco", "tipo": "Egg Chair"}, "in_stock": True},
        {"name": "Poltrona Wing Chair Verde", "description": "Poltrona Wing Chair verde com orelhas altas e estofado premium. Design clássico inglês que oferece proteção contra correntes de ar e máximo conforto.", "price": 2799.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1718049719688-764249c6800d", "specifications": {"material": "Tecido Premium", "cor": "Verde", "tipo": "Wing Chair"}, "in_stock": True},
        {"name": "Poltrona Barcelona Caramelo", "description": "Poltrona Barcelona em couro caramelo com estrutura cromada. Ícone do design moderno, combina estética minimalista com conforto excepcional.", "price": 3299.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1601366533287-5ee4c763ae4e", "specifications": {"material": "Couro + Aço Cromado", "cor": "Caramelo", "tipo": "Barcelona"}, "in_stock": True},
        {"name": "Poltrona Chaise Longue Rosa", "description": "Poltrona chaise longue rosa com design romântico e feminino. Estofado macio em veludo premium, ideal para quartos e espaços íntimos.", "price": 2199.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7", "specifications": {"material": "Veludo", "cor": "Rosa", "tipo": "Chaise Longue"}, "in_stock": True},
        {"name": "Poltrona Papai Urso Cinza", "description": "Poltrona Papai Urso cinza com design oversized e ultra confortável. Perfeita para momentos de leitura e relaxamento, oferece o máximo em conforto e aconchego.", "price": 2699.90, "category_id": category_map["poltronas"]["id"], "image_url": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88", "specifications": {"material": "Tecido Macio", "cor": "Cinza", "tipo": "Papai Urso"}, "in_stock": True},
        
        # ALMOFADAS DECORATIVAS (10 produtos)
        {"name": "Kit 4 Almofadas Geométricas", "description": "Conjunto de 4 almofadas com estampas geométricas modernas em tons neutros. Tecido premium anti-manchas, ideais para sofás contemporâneos e decoração clean.", "price": 399.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1633439446662-68e86adc2a6c", "specifications": {"quantidade": "4", "tamanho": "45x45cm", "material": "Algodão Premium"}, "in_stock": True},
        {"name": "Almofadas Florais Provençal", "description": "Almofadas com estampas florais em estilo provençal francês. Tecido 100% algodão com enchimento de fibra siliconada, trazem romantismo e delicadeza ao ambiente.", "price": 299.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1680965075898-39e6c2db33a8", "specifications": {"quantidade": "2", "tamanho": "50x50cm", "material": "Algodão 100%"}, "in_stock": True},
        {"name": "Almofadas Veludo Dourado Luxo", "description": "Almofadas em veludo dourado com acabamento premium e brilho sutil. Adicionam glamour e sofisticação a qualquer ambiente, ideais para decorações luxuosas.", "price": 499.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.pexels.com/photos/33882537/pexels-photo-33882537.jpeg", "specifications": {"quantidade": "2", "tamanho": "40x60cm", "material": "Veludo Dourado"}, "in_stock": True},
        {"name": "Kit Almofadas Étnicas Coloridas", "description": "Conjunto de almofadas com estampas étnicas e cores vibrantes. Desenhos inspirados na cultura mundial, perfeitas para ambientes boêmios e ecléticos.", "price": 349.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.pexels.com/photos/33880467/pexels-photo-33880467.jpeg", "specifications": {"quantidade": "3", "tamanho": "45x45cm", "material": "Tecido Étnico"}, "in_stock": True},
        {"name": "Almofadas Lisas Tons Pastel", "description": "Conjunto de almofadas lisas em tons pastel suaves. Cores harmoniosas que complementam decorações delicadas e criam atmosfera serena e acolhedora.", "price": 279.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1553114552-c4ece3a33c93", "specifications": {"quantidade": "3", "tamanho": "45x45cm", "material": "Algodão"}, "in_stock": True},
        {"name": "Almofadas Rústicas Juta", "description": "Almofadas rústicas em juta natural com texturas diferenciadas. Ideais para decorações campestres, fazendas e ambientes que valorizam o natural.", "price": 199.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e", "specifications": {"quantidade": "2", "tamanho": "50x30cm", "material": "Juta Natural"}, "in_stock": True},
        {"name": "Almofadas Bordadas Luxo", "description": "Almofadas com bordados artesanais exclusivos feitos à mão. Cada peça é única, combinando tradição artesanal com design contemporâneo premium.", "price": 599.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1630069143687-7fb3ed516b44", "specifications": {"quantidade": "2", "tamanho": "45x45cm", "material": "Linho Bordado"}, "in_stock": True},
        {"name": "Kit Almofadas Infantis", "description": "Conjunto de almofadas coloridas com estampas infantis divertidas. Tecidos hipoalergênicos e seguros, perfeitas para quartos de crianças e espaços kids.", "price": 259.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1630051264159-0c9c8d14e37f", "specifications": {"quantidade": "4", "tamanho": "40x40cm", "material": "Algodão Hipoalergênico"}, "in_stock": True},
        {"name": "Almofadas Outdoor Impermeáveis", "description": "Almofadas especiais para áreas externas com tecido impermeável e anti-UV. Resistem à chuva e sol, mantendo cores vibrantes por mais tempo.", "price": 399.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1642462655543-654adba2b06f", "specifications": {"quantidade": "2", "tamanho": "50x50cm", "material": "Tecido Impermeável"}, "in_stock": True},
        {"name": "Almofadas Lombar Ergonômicas", "description": "Almofadas lombares ergonômicas para apoio postural. Design anatômico que oferece suporte ideal para as costas durante longas permanências sentado.", "price": 179.90, "category_id": category_map["almofadas"]["id"], "image_url": "https://images.unsplash.com/photo-1631709536651-2db17d0b2cdb", "specifications": {"quantidade": "1", "tamanho": "40x25cm", "material": "Memory Foam"}, "in_stock": True},
        
        # PUFFS MODERNOS (10 produtos)
        {"name": "Puff Redondo Veludo Verde", "description": "Puff redondo em veludo verde esmeralda com base dourada. Design luxuoso que adiciona cor e sofisticação, perfeito como assento extra ou apoio para os pés.", "price": 499.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1560448204-603b3fc33ddc", "specifications": {"formato": "Redondo", "material": "Veludo", "cor": "Verde"}, "in_stock": True},
        {"name": "Puff Quadrado Couro Caramelo", "description": "Puff quadrado em couro caramelo com costuras contrastantes. Design masculino e elegante, oferece durabilidade superior e estilo atemporal.", "price": 599.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1565374369705-acde12f3caa2", "specifications": {"formato": "Quadrado", "material": "Couro", "cor": "Caramelo"}, "in_stock": True},
        {"name": "Puff Cilíndrico Tecido Listrado", "description": "Puff cilíndrico com tecido listrado em tons neutros. Design versátil e moderno, ideal para espaços contemporâneos que valorizam funcionalidade e estilo.", "price": 399.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1723896625696-68a28b20db48", "specifications": {"formato": "Cilíndrico", "material": "Tecido", "cor": "Listrado"}, "in_stock": True},
        {"name": "Puff Ottoman Capitonê Rosa", "description": "Puff ottoman com capitonê rosa delicado e pés torneados. Charme vintage com toque feminino, perfeito para quartos românticos e salas clássicas.", "price": 699.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.pexels.com/photos/2079249/pexels-photo-2079249.jpeg", "specifications": {"formato": "Ottoman", "material": "Courino", "cor": "Rosa"}, "in_stock": True},
        {"name": "Puff Baú com Armazenamento", "description": "Puff baú multifuncional com compartimento interno para armazenamento. Solução prática que combina assentos extras com organização inteligente do espaço.", "price": 799.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.pexels.com/photos/2079246/pexels-photo-2079246.jpeg", "specifications": {"formato": "Baú", "material": "Courino", "cor": "Marrom"}, "in_stock": True},
        {"name": "Puff Hexagonal Moderno Cinza", "description": "Puff hexagonal com design geométrico moderno em tecido cinza. Forma inovadora que se destaca na decoração, oferecendo conforto e visual contemporâneo.", "price": 549.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1503278034495-2865fce44a95", "specifications": {"formato": "Hexagonal", "material": "Tecido", "cor": "Cinza"}, "in_stock": True},
        {"name": "Puff Vintage Industrial", "description": "Puff com design vintage industrial, base de ferro e assento em couro envelhecido. Peça única que combina história e funcionalidade para ambientes autênticos.", "price": 699.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1519947486511-46149fa0a254", "specifications": {"formato": "Industrial", "material": "Couro + Ferro", "cor": "Marrom"}, "in_stock": True},
        {"name": "Puff Escandinavo Madeira Clara", "description": "Puff escandinavo com base de madeira clara e assento estofado. Design minimalista nórdico que prioriza funcionalidade e beleza natural dos materiais.", "price": 449.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c", "specifications": {"formato": "Redondo", "material": "Madeira + Tecido", "cor": "Natural"}, "in_stock": True},
        {"name": "Puff Futon Japonês", "description": "Puff futon estilo japonês baixo com enchimento tradicional. Design zen que promove postura correta e bem-estar, ideal para espaços de meditação e relaxamento.", "price": 359.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1573476102509-6e8b7e1dd6c2", "specifications": {"formato": "Futon", "material": "Algodão", "cor": "Bege"}, "in_stock": True},
        {"name": "Puff Dourado Glamour", "description": "Puff em veludo dourado com acabamento metalizado e pés acrilicos. Luxo máximo para ambientes glamourosos que não abrem mão de sofisticação e brilho.", "price": 899.90, "category_id": category_map["puffs"]["id"], "image_url": "https://images.unsplash.com/photo-1529290130-f4ba0ac2b841", "specifications": {"formato": "Redondo", "material": "Veludo Dourado", "cor": "Dourado"}, "in_stock": True},
        
        # CLOSET INDUSTRIAL DE QUARTO (10 produtos)
        {"name": "Closet Industrial Grande 4 Portas", "description": "Closet industrial grande com 4 portas em ferro e madeira rústica. Amplo espaço interno com divisórias ajustáveis, ideal para quartos master e lofts modernos.", "price": 3299.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.pexels.com/photos/33880475/pexels-photo-33880475.jpeg", "specifications": {"portas": "4", "material": "Ferro e Madeira", "cor": "Preto e Natural"}, "in_stock": True},
        {"name": "Closet Aberto Estilo Loft", "description": "Closet aberto estilo loft com prateleiras e cabideiros em ferro. Design industrial minimalista que transforma o quarto em um ambiente urbano e moderno.", "price": 2799.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1593069431672-f903a33c286f", "specifications": {"tipo": "Aberto", "material": "Ferro", "cor": "Preto"}, "in_stock": True},
        {"name": "Closet Compacto 2 Portas", "description": "Closet compacto industrial com 2 portas, perfeito para quartos pequenos. Maximiza o armazenamento sem ocupar muito espaço, mantendo o estilo industrial.", "price": 1999.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg", "specifications": {"portas": "2", "material": "Ferro e MDF", "cor": "Grafite"}, "in_stock": True},
        {"name": "Closet Industrial com Espelho", "description": "Closet industrial com porta espelhada que amplia visualmente o quarto. Combina funcionalidade com estética, oferecendo armazenamento e praticidade.", "price": 3599.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1554995207-c18c203602cb", "specifications": {"portas": "3", "material": "Ferro e Espelho", "cor": "Preto"}, "in_stock": True},
        {"name": "Closet Aramado Industrial", "description": "Closet aramado industrial totalmente aberto com múltiplos níveis. Visibilidade total das roupas, perfeito para quem gosta de organização aparente e estilo urbano.", "price": 2199.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7", "specifications": {"tipo": "Aramado", "material": "Arame Industrial", "cor": "Preto"}, "in_stock": True},
        {"name": "Closet Vintage com Pátina", "description": "Closet industrial vintage com efeito pátina e detalhes envelhecidos. Para quem busca autenticidade e história em cada móvel, trazendo personalidade única ao quarto.", "price": 3999.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64", "specifications": {"portas": "4", "material": "Ferro Pátina", "cor": "Envelhecido"}, "in_stock": True},
        {"name": "Closet Industrial Juvenil", "description": "Closet industrial especialmente projetado para quartos juvenis. Tamanho adequado para jovens, com compartimentos pensados para roupas e acessórios adolescentes.", "price": 2599.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", "specifications": {"portas": "2", "material": "Ferro e Madeira", "cor": "Azul Industrial"}, "in_stock": True},
        {"name": "Closet Walk-in Industrial", "description": "Closet walk-in industrial para quartos suíte com muito espaço. Sistema modular que permite personalização total da organização interna.", "price": 5999.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1633071141701-9d9b7c5a6fe5", "specifications": {"tipo": "Walk-in", "material": "Ferro e Madeira", "cor": "Industrial"}, "in_stock": True},
        {"name": "Closet Industrial com LED", "description": "Closet industrial com sistema de iluminação LED integrado. Iluminação automática que facilita a organização e adiciona modernidade ao ambiente.", "price": 4299.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1603192399946-8bbb0703cfc4", "specifications": {"portas": "3", "material": "Ferro e LED", "cor": "Preto com LED"}, "in_stock": True},
        {"name": "Closet Suspenso Minimalista", "description": "Closet suspenso industrial minimalista fixado na parede. Economia de espaço no chão, design limpo e funcional para quartos pequenos e médios.", "price": 1799.90, "category_id": category_map["closet-industrial"]["id"], "image_url": "https://images.unsplash.com/photo-1565182999381-18fafda8f8c1", "specifications": {"tipo": "Suspenso", "material": "Ferro", "cor": "Branco Industrial"}, "in_stock": True}
    ]
    
    # Insert products with category names
    for prod_data in products_data:
        category = await db.categories.find_one({"id": prod_data["category_id"]})
        prod_data["category_name"] = category["name"]
        product = Product(**prod_data)
        await db.products.insert_one(product.dict())
    
    # REVIEWS CORRIGIDOS
    reviews_data = [
        {"user_name": "Mariana Silva", "user_location": "Copacabana, RJ", "rating": 5, "comment": "Comprei um sofá booth vermelho para meu café e ficou perfeito! Qualidade excepcional e muito confortável.", "user_image": "https://images.unsplash.com/photo-1494790108755-2616b612b786"},
        {"user_name": "Carlos Mendes", "user_location": "Barra da Tijuca, RJ", "rating": 5, "comment": "O sofá booth preto que comprei superou todas as expectativas. Meus clientes adoraram!", "user_image": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"},
        {"user_name": "Ana Paula Santos", "user_location": "Ipanema, RJ", "rating": 5, "comment": "Poltrona executiva perfeita para meu home office. Design moderno e muito confortável!", "user_image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80"},
        {"user_name": "Roberto Lima", "user_location": "Tijuca, RJ", "rating": 4, "comment": "Closet industrial ficou incrível no meu quarto. Qualidade e design excepcionais!", "user_image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"},
        {"user_name": "Julia Costa", "user_location": "Leblon, RJ", "rating": 5, "comment": "Sofá booth verde para meu bistro ficou um espetáculo. Clientes elogiam sempre!", "user_image": "https://images.unsplash.com/photo-1544005313-94ddf0286df2"},
        {"user_name": "Pedro Oliveira", "user_location": "Flamengo, RJ", "rating": 5, "comment": "Puff dourado deu o toque especial que faltava na minha sala. Luxo e conforto!", "user_image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"}
    ]
    
    for review_data in reviews_data:
        review = Review(**review_data)
        await db.reviews.insert_one(review.dict())
    
    # CREATE ADMIN USER
    admin_user = {
        "id": str(uuid.uuid4()),
        "name": "Admin Estofados",
        "email": "admin@estofados.com",
        "password": get_password_hash("admin123"),
        "phone": "21996197768",
        "created_at": datetime.now(timezone.utc),
        "is_admin": True
    }
    await db.users.insert_one(admin_user)
    
    print("✅ LOJA COMPLETA INICIALIZADA!")
    print("📦 50+ produtos adicionados")
    print("👤 Admin: admin@estofados.com / admin123")