import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

// Import Lucide icons
import { 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  Star, 
  Plus, 
  Minus, 
  Trash2, 
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Crown,
  Sparkles,
  ArrowRight,
  Heart,
  Shield,
  Truck,
  Award
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = "21996197768";

// Context for authentication and cart
const AppContext = React.createContext();

const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const api = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      
      // Update axios instance
      api.defaults.headers.Authorization = `Bearer ${access_token}`;
      
      // Load cart
      await loadCart();
      
      toast.success('Login realizado com sucesso!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/register', userData);
      const { access_token, user: newUser } = response.data;
      
      setToken(access_token);
      setUser(newUser);
      localStorage.setItem('token', access_token);
      
      // Update axios instance
      api.defaults.headers.Authorization = `Bearer ${access_token}`;
      
      toast.success('Cadastro realizado com sucesso!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer cadastro');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCart({ items: [], total: 0 });
    localStorage.removeItem('token');
    delete api.defaults.headers.Authorization;
    toast.success('Logout realizado com sucesso!');
  };

  const loadCart = async () => {
    if (!token) return;
    try {
      const response = await api.get('/cart');
      setCart(response.data);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!token) {
      toast.error('Faça login para adicionar ao carrinho');
      return;
    }
    
    try {
      const response = await api.post('/cart/add', { product_id: productId, quantity });
      setCart(response.data.cart);
      toast.success('Produto adicionado ao carrinho!');
    } catch (error) {
      toast.error('Erro ao adicionar produto ao carrinho');
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const response = await api.delete(`/cart/remove/${productId}`);
      setCart(response.data.cart);
      toast.success('Produto removido do carrinho!');
    } catch (error) {
      toast.error('Erro ao remover produto do carrinho');
    }
  };

  const loadData = async () => {
    try {
      const [categoriesRes, productsRes, reviewsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
        api.get('/reviews')
      ]);
      
      setCategories(categoriesRes.data);
      setProducts(productsRes.data);
      setReviews(reviewsRes.data);
      
      if (token) {
        await loadCart();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (token) {
      // Verify token and load user data
      api.defaults.headers.Authorization = `Bearer ${token}`;
      loadCart();
    }
  }, [token]);

  const value = {
    user,
    token,
    cart,
    categories,
    products,
    reviews,
    isLoading,
    login,
    register,
    logout,
    addToCart,
    removeFromCart,
    loadData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Header Component
const Header = () => {
  const { user, cart, logout } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Gostaria de saber mais sobre os produtos da Estofados Premium Outlet.`;
    window.open(url, '_blank');
  };

  return (
    <>
      <header className="bg-black text-white shadow-2xl relative z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_sofa-boutique-1/artifacts/fts1vd80_Design_sem_nome-removebg-preview.png" 
                alt="Estofados Premium Outlet" 
                className="h-12 w-auto"
              />
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-amber-400">ESTOFADOS</h1>
                <p className="text-sm text-slate-300">PREMIUM OUTLET</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#home" className="hover:text-amber-400 transition-colors">Início</a>
              <a href="#products" className="hover:text-amber-400 transition-colors">Produtos</a>
              <a href="#about" className="hover:text-amber-400 transition-colors">Sobre</a>
              <a href="#testimonials" className="hover:text-amber-400 transition-colors">Depoimentos</a>
              <a href="#contact" className="hover:text-amber-400 transition-colors">Contato</a>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* WhatsApp Button */}
              <button
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all transform hover:scale-105"
              >
                <MessageCircle size={20} />
                <span className="hidden md:inline">WhatsApp</span>
              </button>

              {/* Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:text-amber-400 transition-colors"
              >
                <ShoppingCart size={24} />
                {cart.items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.items.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>

              {/* User */}
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center space-x-2 hover:text-amber-400 transition-colors"
              >
                <User size={24} />
                <span className="hidden md:inline">
                  {user ? user.name.split(' ')[0] : 'Entrar'}
                </span>
              </button>

              {/* Mobile Menu */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-1"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden py-4 border-t border-slate-700">
              <nav className="flex flex-col space-y-4">
                <a href="#home" className="hover:text-amber-400 transition-colors">Início</a>
                <a href="#products" className="hover:text-amber-400 transition-colors">Produtos</a>
                <a href="#about" className="hover:text-amber-400 transition-colors">Sobre</a>
                <a href="#testimonials" className="hover:text-amber-400 transition-colors">Depoimentos</a>
                <a href="#contact" className="hover:text-amber-400 transition-colors">Contato</a>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Cart Modal */}
      {showCart && <CartModal onClose={() => setShowCart(false)} />}
      
      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
};

// Hero Section
const HeroSection = () => {
  const bannerImages = [
    "https://images.unsplash.com/photo-1680503397090-0483be73406f",
    "https://images.unsplash.com/photo-1680503397107-475907e4f3e3",
    "https://images.unsplash.com/photo-1687180498602-5a1046defaa4"
  ];

  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Gostaria de conhecer mais sobre os produtos premium da Estofados Premium Outlet.`;
    window.open(url, '_blank');
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={bannerImages[currentBanner]}
          alt="Estofados Premium"
          className="w-full h-full object-cover transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-slate-900/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="flex items-center justify-center mb-6">
            <Crown className="text-amber-400 mr-3" size={40} />
            <h1 className="text-5xl md:text-7xl font-serif text-amber-400">
              PREMIUM
            </h1>
            <Crown className="text-amber-400 ml-3" size={40} />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Estofados de <span className="text-amber-400">Luxo</span> para sua Casa
          </h2>
          
          <p className="text-xl md:text-2xl mb-8 text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Descubra nossa coleção exclusiva de sofás, poltronas e móveis industriais 
            com design sofisticado e qualidade incomparável.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={openWhatsApp}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 
                         text-slate-900 font-bold px-8 py-4 rounded-full flex items-center space-x-3 
                         transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <MessageCircle size={24} />
              <span>Fale Conosco no WhatsApp</span>
              <ArrowRight size={20} />
            </button>
            
            <a
              href="#products"
              className="border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-900 
                         font-bold px-8 py-4 rounded-full transition-all transform hover:scale-105"
            >
              Ver Produtos
            </a>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-3 bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
              <Shield className="text-amber-400" size={24} />
              <span>Garantia Premium</span>
            </div>
            <div className="flex items-center justify-center space-x-3 bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
              <Truck className="text-amber-400" size={24} />
              <span>Entrega Grátis RJ</span>
            </div>
            <div className="flex items-center justify-center space-x-3 bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
              <Award className="text-amber-400" size={24} />
              <span>Qualidade Certificada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {bannerImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentBanner(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              currentBanner === index ? 'bg-amber-400' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

// Categories Section
const CategoriesSection = () => {
  const { categories } = useAppContext();

  return (
    <section className="py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Nossas <span className="text-amber-600">Categorias</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Explore nossa ampla variedade de produtos premium para todos os ambientes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
            >
              <div className="aspect-w-16 aspect-h-12 relative">
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-amber-400 transition-colors">
                  {category.name}
                </h3>
                <p className="text-slate-200 mb-4">
                  {category.description}
                </p>
                <button
                  onClick={() => {
                    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                >
                  <span>Ver Produtos</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Products Section
const ProductsSection = () => {
  const { products, categories, addToCart } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category_id === selectedCategory));
    }
  }, [selectedCategory, products]);

  const openWhatsApp = (product) => {
    const message = `Olá! Tenho interesse no produto: ${product.name} - R$ ${product.price.toFixed(2).replace('.', ',')}. Gostaria de mais informações.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <section id="products" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Nossos <span className="text-amber-600">Produtos</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Móveis premium com design exclusivo e qualidade superior
          </p>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  selectedCategory === category.id
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-105"
            >
              <div className="relative overflow-hidden">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {product.category_name}
                  </span>
                </div>
                {!product.in_stock && (
                  <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
                      Indisponível
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">
                  {product.name}
                </h3>
                <p className="text-slate-600 mb-4 line-clamp-2">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-end mb-4">
                  <button className="text-slate-400 hover:text-red-500 transition-colors">
                    <Heart size={24} />
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => addToCart(product.id)}
                    disabled={!product.in_stock}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart size={18} />
                    <span>Carrinho</span>
                  </button>
                  <button
                    onClick={() => openWhatsApp(product)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                  >
                    <MessageCircle size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-xl">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </div>
    </section>
  );
};

// Testimonials Section
const TestimonialsSection = () => {
  const { reviews } = useAppContext();

  return (
    <section id="testimonials" className="py-16 bg-slate-800 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            O que nossos <span className="text-amber-400">clientes</span> dizem
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Depoimentos reais de clientes satisfeitos em todo o Rio de Janeiro
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-slate-700 rounded-2xl p-6 hover:bg-slate-600 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-center mb-4">
                <img
                  src={review.user_image}
                  alt={review.user_name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-white">{review.user_name}</h4>
                  <p className="text-slate-300 text-sm flex items-center">
                    <MapPin size={14} className="mr-1" />
                    {review.user_location}
                  </p>
                </div>
              </div>

              <div className="flex items-center mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={i < review.rating ? 'text-amber-400 fill-current' : 'text-slate-500'}
                  />
                ))}
              </div>

              <p className="text-slate-200 leading-relaxed">
                "{review.comment}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Contact Section
const ContactSection = () => {
  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Gostaria de entrar em contato com a Estofados Premium Outlet.`;
    window.open(url, '_blank');
  };

  return (
    <section id="contact" className="py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Entre em <span className="text-amber-600">Contato</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Estamos prontos para atendê-lo com a melhor experiência em móveis premium
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-amber-500 p-3 rounded-lg">
                <Phone className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Telefone & WhatsApp</h3>
                <p className="text-slate-600">(21) 99619-7768</p>
                <button
                  onClick={openWhatsApp}
                  className="text-amber-600 hover:text-amber-700 font-semibold mt-1"
                >
                  Clique para conversar →
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-amber-500 p-3 rounded-lg">
                <Mail className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Email</h3>
                <p className="text-slate-600">contato@estofadospremium.com.br</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-amber-500 p-3 rounded-lg">
                <MapPin className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Localização</h3>
                <p className="text-slate-600">Atendemos todo o Rio de Janeiro</p>
                <p className="text-slate-600">Entrega gratuita na região metropolitana</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-amber-500 p-3 rounded-lg">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Horário de Atendimento</h3>
                <p className="text-slate-600">Segunda a Sexta: 9h às 18h</p>
                <p className="text-slate-600">Sábado: 9h às 16h</p>
                <p className="text-slate-600">WhatsApp: 24h disponível</p>
              </div>
            </div>
          </div>

          {/* CTA Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-8 text-white">
            <div className="text-center">
              <Crown className="text-amber-400 mx-auto mb-4" size={48} />
              <h3 className="text-2xl font-bold mb-4">
                Pronto para transformar sua casa?
              </h3>
              <p className="text-slate-300 mb-8 leading-relaxed">
                Entre em contato conosco e descubra como nossos móveis premium 
                podem elevar o padrão do seu ambiente com design exclusivo e qualidade superior.
              </p>
              
              <button
                onClick={openWhatsApp}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 
                           text-slate-900 font-bold px-8 py-4 rounded-full flex items-center space-x-3 
                           transition-all transform hover:scale-105 shadow-lg hover:shadow-xl mx-auto"
              >
                <MessageCircle size={24} />
                <span>Falar no WhatsApp</span>
                <ArrowRight size={20} />
              </button>

              <div className="flex items-center justify-center space-x-6 mt-8 pt-6 border-t border-slate-600">
                <div className="text-center">
                  <Shield className="text-amber-400 mx-auto mb-1" size={24} />
                  <p className="text-sm text-slate-300">Garantia Premium</p>
                </div>
                <div className="text-center">
                  <Truck className="text-amber-400 mx-auto mb-1" size={24} />
                  <p className="text-sm text-slate-300">Entrega Grátis</p>
                </div>
                <div className="text-center">
                  <Award className="text-amber-400 mx-auto mb-1" size={24} />
                  <p className="text-sm text-slate-300">Qualidade Certificada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Cart Modal
const CartModal = ({ onClose }) => {
  const { cart, removeFromCart } = useAppContext();

  const openWhatsApp = () => {
    const items = cart.items.map(item => 
      `${item.product_name} (${item.quantity}x) - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`
    ).join('\n');
    
    const total = cart.total.toFixed(2).replace('.', ',');
    const message = `Olá! Gostaria de finalizar minha compra:\n\n${items}\n\nTotal: R$ ${total}\n\nPor favor, me ajude com o processo de compra.`;
    
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-800">Seu Carrinho</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-6">
          {cart.items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-slate-500 text-lg">Seu carrinho está vazio</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.product_id} className="flex items-center space-x-4 bg-slate-50 p-4 rounded-lg">
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{item.product_name}</h3>
                    <p className="text-slate-600">
                      R$ {item.price.toFixed(2).replace('.', ',')} x {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-red-500 hover:text-red-700 mt-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="p-6 border-t bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold text-slate-800">Total:</span>
              <span className="text-2xl font-bold text-amber-600">
                R$ {cart.total.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <button
              onClick={openWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg 
                         flex items-center justify-center space-x-3 transition-all transform hover:scale-105"
            >
              <MessageCircle size={24} />
              <span>Finalizar no WhatsApp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Auth Modal
const AuthModal = ({ onClose }) => {
  const { login, register, logout, user, isLoading } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      const success = await login(formData.email, formData.password);
      if (success) onClose();
    } else {
      const success = await register(formData);
      if (success) onClose();
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Minha Conta</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="text-center">
            <div className="bg-amber-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <User className="text-amber-600" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">{user.name}</h3>
            <p className="text-slate-600 mb-6">{user.email}</p>
            
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            {isLogin ? 'Não tem conta? Criar uma agora' : 'Já tem conta? Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_sofa-boutique-1/artifacts/fts1vd80_Design_sem_nome-removebg-preview.png" 
                alt="Estofados Premium Outlet" 
                className="h-12 w-auto"
              />
              <div>
                <h3 className="text-xl font-bold text-amber-400">ESTOFADOS</h3>
                <p className="text-sm text-slate-300">PREMIUM OUTLET</p>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed max-w-md">
              Há mais de uma década transformando lares com móveis de qualidade premium. 
              Design exclusivo, conforto incomparável e durabilidade garantida.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-amber-400 mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li><a href="#home" className="text-slate-300 hover:text-white transition-colors">Início</a></li>
              <li><a href="#products" className="text-slate-300 hover:text-white transition-colors">Produtos</a></li>
              <li><a href="#testimonials" className="text-slate-300 hover:text-white transition-colors">Depoimentos</a></li>
              <li><a href="#contact" className="text-slate-300 hover:text-white transition-colors">Contato</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-amber-400 mb-4">Contato</h4>
            <div className="space-y-2 text-slate-300">
              <p className="flex items-center">
                <Phone size={16} className="mr-2" />
                (21) 99619-7768
              </p>
              <p className="flex items-center">
                <Mail size={16} className="mr-2" />
                contato@estofadospremium.com.br
              </p>
              <p className="flex items-center">
                <MapPin size={16} className="mr-2" />
                Rio de Janeiro, RJ
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-8 pt-8 text-center">
          <p className="text-slate-400">
            © 2024 Estofados Premium Outlet. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
const Home = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <CategoriesSection />
      <ProductsSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </AppProvider>
  );
}

export default App;