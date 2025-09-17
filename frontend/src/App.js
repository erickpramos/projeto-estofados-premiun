import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams, Link } from "react-router-dom";
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
  Award,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Building,
  Users,
  Target,
  Zap,
  Home,
  Package,
  HelpCircle,
  Lock,
  RotateCcw,
  Info
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    category: 'all',
    material: 'all',
    color: 'all',
    environment: 'all'
  });
  const [sortBy, setSortBy] = useState('name');

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

  // Filter and search products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedFilters.category === 'all' || product.category_id === selectedFilters.category;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'popular':
        return Math.random() - 0.5; // Random for demo
      default:
        return 0;
    }
  });

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
    searchTerm,
    setSearchTerm,
    selectedFilters,
    setSelectedFilters,
    sortBy,
    setSortBy,
    filteredProducts,
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

// Loading Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
  </div>
);

// Back to Top Button
const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-20 right-6 bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-full shadow-lg transition-all z-40"
    >
      <ArrowUp size={20} />
    </button>
  );
};

// Header Component with Search
const Header = () => {
  const { user, cart, logout, searchTerm, setSearchTerm } = useAppContext();
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
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_sofa-boutique-1/artifacts/fts1vd80_Design_sem_nome-removebg-preview.png" 
                alt="Estofados Premium Outlet" 
                className="h-12 w-auto"
              />
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-amber-400">ESTOFADOS</h1>
                <p className="text-sm text-slate-300">PREMIUM OUTLET</p>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="hover:text-amber-400 transition-colors">Início</Link>
              <Link to="/produtos" className="hover:text-amber-400 transition-colors">Produtos</Link>
              <Link to="/sobre" className="hover:text-amber-400 transition-colors">Sobre</Link>
              <a href="#testimonials" className="hover:text-amber-400 transition-colors">Depoimentos</a>
              <Link to="/contato" className="hover:text-amber-400 transition-colors">Contato</Link>
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
              {/* Mobile Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <nav className="flex flex-col space-y-4">
                <Link to="/" className="hover:text-amber-400 transition-colors">Início</Link>
                <Link to="/produtos" className="hover:text-amber-400 transition-colors">Produtos</Link>
                <Link to="/sobre" className="hover:text-amber-400 transition-colors">Sobre</Link>
                <a href="#testimonials" className="hover:text-amber-400 transition-colors">Depoimentos</a>
                <Link to="/contato" className="hover:text-amber-400 transition-colors">Contato</Link>
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

// Breadcrumb Component
const Breadcrumb = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-6">
      <Link to="/" className="hover:text-amber-600">
        <Home size={16} />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={16} />
          {item.href ? (
            <Link to={item.href} className="hover:text-amber-600">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Product Card Component
const ProductCard = ({ product }) => {
  const { addToCart } = useAppContext();

  const openWhatsApp = () => {
    const message = `Olá! Tenho interesse no produto: ${product.name}. Gostaria de mais informações.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-105">
      <div className="relative overflow-hidden">
        <Link to={`/produto/${product.id}`}>
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
          />
        </Link>
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
        <Link to={`/produto/${product.id}`}>
          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">
            {product.name}
          </h3>
        </Link>
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
            onClick={openWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      </div>
    </div>
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
            
            <Link
              to="/produtos"
              className="border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-900 
                         font-bold px-8 py-4 rounded-full transition-all transform hover:scale-105"
            >
              Ver Produtos
            </Link>
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
            <Link
              key={category.id}
              to={`/produtos?categoria=${category.id}`}
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
                <div className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 w-fit">
                  <span>Ver Produtos</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// Products Page Component
const ProductsPage = () => {
  const { 
    categories, 
    filteredProducts, 
    isLoading, 
    selectedFilters, 
    setSelectedFilters, 
    sortBy, 
    setSortBy 
  } = useAppContext();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: 'Produtos' }]} />
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <Filter className="mr-2" size={20} />
                Filtros
              </h3>
              
              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categoria
                </label>
                <select
                  value={selectedFilters.category}
                  onChange={(e) => setSelectedFilters({...selectedFilters, category: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="name">Nome A-Z</option>
                  <option value="newest">Mais recentes</option>
                  <option value="popular">Mais populares</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:w-3/4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-slate-800">
                Nossos Produtos
              </h1>
              <p className="text-slate-600">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            </div>

            {isLoading ? (
              <LoadingSpinner />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto mb-4 text-slate-400" size={64} />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-slate-500">
                  Tente ajustar os filtros ou termo de busca
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Product Detail Page
const ProductDetailPage = () => {
  const { id } = useParams();
  const { products, addToCart, categories } = useAppContext();
  const [product, setProduct] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const foundProduct = products.find(p => p.id === id);
    setProduct(foundProduct);
  }, [id, products]);

  const openWhatsApp = () => {
    if (!product) return;
    const message = `Olá! Tenho interesse no produto: ${product.name}. Gostaria de mais informações sobre especificações, disponibilidade e formas de pagamento.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [product.image_url];
  const relatedProducts = products.filter(p => 
    p.category_id === product.category_id && p.id !== product.id
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={[
          { label: 'Produtos', href: '/produtos' },
          { label: product.category_name, href: `/produtos?categoria=${product.category_id}` },
          { label: product.name }
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Product Images */}
          <div>
            <div className="mb-4">
              <img
                src={images[currentImage]}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
              />
            </div>
            {images.length > 1 && (
              <div className="flex space-x-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden ${
                      currentImage === index ? 'ring-2 ring-amber-500' : ''
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4 inline-block">
              {product.category_name}
            </span>
            
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              {product.name}
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              {product.description}
            </p>

            {/* Specifications */}
            {Object.keys(product.specifications).length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-4">
                  Especificações
                </h3>
                <div className="bg-white rounded-lg p-4 shadow-md">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-slate-200 last:border-b-0">
                      <span className="font-medium text-slate-700 capitalize">
                        {key}:
                      </span>
                      <span className="text-slate-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center mb-8">
              {product.in_stock ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="mr-2" size={20} />
                  <span className="font-medium">Em estoque</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="mr-2" size={20} />
                  <span className="font-medium">Indisponível</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => addToCart(product.id)}
                disabled={!product.in_stock}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <ShoppingCart size={20} />
                <span>Adicionar ao Carrinho</span>
              </button>
              
              <button
                onClick={openWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle size={20} />
                <span>Consultar via WhatsApp</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <Shield className="text-amber-500 mb-2" size={24} />
                <span className="text-sm text-slate-600">Garantia Premium</span>
              </div>
              <div className="flex flex-col items-center">
                <Truck className="text-amber-500 mb-2" size={24} />
                <span className="text-sm text-slate-600">Entrega Grátis</span>
              </div>
              <div className="flex flex-col items-center">
                <Award className="text-amber-500 mb-2" size={24} />
                <span className="text-sm text-slate-600">Qualidade Certificada</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-8">
              Produtos Relacionados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// About Page
const AboutPage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: 'Sobre Nós' }]} />
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Sobre a <span className="text-amber-600">Estofados Premium Outlet</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Há mais de uma década, transformamos lares com móveis de qualidade excepcional, 
            design exclusivo e atendimento personalizado no Rio de Janeiro.
          </p>
        </div>

        {/* Company Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          <div className="text-center bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl font-bold text-amber-600 mb-2">10+</div>
            <div className="text-slate-600">Anos de Experiência</div>
          </div>
          <div className="text-center bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl font-bold text-amber-600 mb-2">5000+</div>
            <div className="text-slate-600">Clientes Satisfeitos</div>
          </div>
          <div className="text-center bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl font-bold text-amber-600 mb-2">50+</div>
            <div className="text-slate-600">Modelos Exclusivos</div>
          </div>
          <div className="text-center bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl font-bold text-amber-600 mb-2">100%</div>
            <div className="text-slate-600">Garantia de Qualidade</div>
          </div>
        </div>

        {/* Story Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="flex items-center mb-6">
              <Target className="text-amber-500 mr-3" size={32} />
              <h2 className="text-3xl font-bold text-slate-800">Nossa Missão</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Proporcionar móveis de alta qualidade que combinam conforto, elegância e durabilidade, 
              transformando cada ambiente em um reflexo da personalidade e estilo de vida dos nossos clientes.
            </p>
          </div>

          <div>
            <div className="flex items-center mb-6">
              <Zap className="text-amber-500 mr-3" size={32} />
              <h2 className="text-3xl font-bold text-slate-800">Nossa Visão</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Ser a referência em móveis premium no Rio de Janeiro, reconhecida pela excelência 
              em produtos, atendimento personalizado e compromisso com a satisfação total dos clientes.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Nossos Valores</h2>
            <p className="text-slate-600">Os princípios que guiam nosso trabalho todos os dias</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-amber-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Crown className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Qualidade Premium</h3>
              <p className="text-slate-600">
                Selecionamos apenas os melhores materiais e fornecedores para garantir 
                produtos de qualidade superior.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-amber-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Atendimento Personalizado</h3>
              <p className="text-slate-600">
                Cada cliente recebe atenção individual, com consultoria especializada 
                para encontrar a solução perfeita.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-amber-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-amber-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Compromisso</h3>
              <p className="text-slate-600">
                Cumprimos nossos prazos e garantias, mantendo a transparência 
                em todas as etapas do processo.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Pronto para conhecer nossos produtos?</h2>
          <p className="text-xl mb-6">
            Visite nosso showroom ou entre em contato para uma consultoria personalizada
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/produtos"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Ver Produtos
            </Link>
            <Link
              to="/contato"
              className="border-2 border-white text-white hover:bg-white hover:text-slate-800 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Fale Conosco
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Page
const ContactPage = () => {
  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Gostaria de entrar em contato com a Estofados Premium Outlet.`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: 'Contato' }]} />
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Entre em <span className="text-amber-600">Contato</span>
          </h1>
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
                <Clock className="text-white" size={24} />
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
    </div>
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

// Cart Modal
const CartModal = ({ onClose }) => {
  const { cart, removeFromCart } = useAppContext();

  const openWhatsApp = () => {
    const items = cart.items.map(item => 
      `${item.product_name} (${item.quantity}x)`
    ).join('\n');
    
    const message = `Olá! Gostaria de finalizar minha compra:\n\n${items}\n\nPor favor, me ajude com o processo de compra.`;
    
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
                      Quantidade: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
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
            <p className="text-slate-300 leading-relaxed max-w-md mb-4">
              Há mais de uma década transformando lares com móveis de qualidade premium. 
              Design exclusivo, conforto incomparável e durabilidade garantida.
            </p>
            <p className="text-slate-400 text-sm">
              CNPJ: 12.345.678/0001-90 | Estofados Premium Outlet Ltda.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-amber-400 mb-4">Links Úteis</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-slate-300 hover:text-white transition-colors">Início</Link></li>
              <li><Link to="/produtos" className="text-slate-300 hover:text-white transition-colors">Produtos</Link></li>
              <li><Link to="/sobre" className="text-slate-300 hover:text-white transition-colors">Sobre Nós</Link></li>
              <li><Link to="/contato" className="text-slate-300 hover:text-white transition-colors">Contato</Link></li>
              <li><Link to="/faq" className="text-slate-300 hover:text-white transition-colors">FAQ</Link></li>
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

        <div className="border-t border-slate-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-400 mb-4 md:mb-0">
            © 2024 Estofados Premium Outlet. Todos os direitos reservados.
          </p>
          <div className="flex space-x-4 text-slate-400 text-sm">
            <Link to="/politica-privacidade" className="hover:text-white transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/termos-uso" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link to="/politica-troca" className="hover:text-white transition-colors">
              Política de Troca
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Home Component
const Home = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <CategoriesSection />
      <TestimonialsSection />
      <BackToTop />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <div className="App">
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/produto/:id" element={<ProductDetailPage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/contato" element={<ContactPage />} />
            {/* Institutional Pages - Simple placeholders for now */}
            <Route path="/faq" element={
              <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                  <HelpCircle className="mx-auto mb-4 text-amber-500" size={64} />
                  <h1 className="text-3xl font-bold text-slate-800 mb-4">FAQ - Em Breve</h1>
                  <p className="text-slate-600">Esta página estará disponível em breve.</p>
                  <Link to="/" className="text-amber-600 hover:text-amber-700 font-medium mt-4 inline-block">
                    Voltar ao Início
                  </Link>
                </div>
              </div>
            } />
            <Route path="/politica-privacidade" element={
              <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="mx-auto mb-4 text-amber-500" size={64} />
                  <h1 className="text-3xl font-bold text-slate-800 mb-4">Política de Privacidade - Em Breve</h1>
                  <p className="text-slate-600">Esta página estará disponível em breve.</p>
                  <Link to="/" className="text-amber-600 hover:text-amber-700 font-medium mt-4 inline-block">
                    Voltar ao Início
                  </Link>
                </div>
              </div>
            } />
            <Route path="/termos-uso" element={
              <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="mx-auto mb-4 text-amber-500" size={64} />
                  <h1 className="text-3xl font-bold text-slate-800 mb-4">Termos de Uso - Em Breve</h1>
                  <p className="text-slate-600">Esta página estará disponível em breve.</p>
                  <Link to="/" className="text-amber-600 hover:text-amber-700 font-medium mt-4 inline-block">
                    Voltar ao Início
                  </Link>
                </div>
              </div>
            } />
            <Route path="/politica-troca" element={
              <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                  <RotateCcw className="mx-auto mb-4 text-amber-500" size={64} />
                  <h1 className="text-3xl font-bold text-slate-800 mb-4">Política de Troca - Em Breve</h1>
                  <p className="text-slate-600">Esta página estará disponível em breve.</p>
                  <Link to="/" className="text-amber-600 hover:text-amber-700 font-medium mt-4 inline-block">
                    Voltar ao Início
                  </Link>
                </div>
              </div>
            } />
          </Routes>
          <Footer />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </div>
    </AppProvider>
  );
}

export default App;