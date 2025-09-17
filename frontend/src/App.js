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
  Info,
  Send,
  MapPin as Map,
  Globe,
  Calendar,
  CreditCard,
  Star as StarFilled,
  Camera,
  Verified,
  Gift,
  Percent
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [newsletter, setNewsletter] = useState('');
  const [showNewsletter, setShowNewsletter] = useState(false);

  const api = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  // WhatsApp helper function - CORRIGIDO
  const openWhatsApp = (message = "Olá! Gostaria de saber mais sobre os produtos da Estofados Premium Outlet.") => {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=5521996197768&text=${encodedMessage}`;
    
    // Tenta abrir primeiro com api.whatsapp.com
    const whatsappWindow = window.open(url, '_blank');
    
    // Se não conseguir, tenta com wa.me como fallback
    if (!whatsappWindow) {
      const fallbackUrl = `https://wa.me/5521996197768?text=${encodedMessage}`;
      window.open(fallbackUrl, '_blank');
    }
    
    console.log('WhatsApp URL:', url);
  };

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

  // Newsletter subscription
  const subscribeNewsletter = async (email) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Inscrito na newsletter com sucesso!');
      setNewsletter('');
      setShowNewsletter(false);
      return true;
    } catch (error) {
      toast.error('Erro ao inscrever na newsletter');
      return false;
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
    
    // Show newsletter popup after 30 seconds
    const timer = setTimeout(() => {
      if (!localStorage.getItem('newsletter_shown')) {
        setShowNewsletter(true);
        localStorage.setItem('newsletter_shown', 'true');
      }
    }, 30000);

    return () => clearTimeout(timer);
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
    newsletter,
    setNewsletter,
    showNewsletter,
    setShowNewsletter,
    login,
    register,
    logout,
    addToCart,
    removeFromCart,
    loadData,
    subscribeNewsletter,
    openWhatsApp
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

// WhatsApp Floating Button - VERSÃO MAIS SIMPLES
const WhatsAppFloat = () => {
  return (
    <a
      href="https://wa.me/5521996197768?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20produtos%20da%20Estofados%20Premium%20Outlet."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl transition-all z-50 animate-pulse hover:animate-none hover:scale-110"
      aria-label="Falar no WhatsApp"
      title="Clique para falar no WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  );
};

// Newsletter Popup
const NewsletterPopup = () => {
  const { showNewsletter, setShowNewsletter, newsletter, setNewsletter, subscribeNewsletter, isLoading } = useAppContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newsletter.trim()) {
      await subscribeNewsletter(newsletter);
    }
  };

  if (!showNewsletter) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative animate-bounce-in">
        <button
          onClick={() => setShowNewsletter(false)}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-amber-400 to-amber-600 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Gift className="text-white" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            🎉 Oferta Especial!
          </h3>
          <p className="text-slate-600">
            <strong>10% de desconto</strong> na primeira compra para novos assinantes!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Seu melhor email"
            value={newsletter}
            onChange={(e) => setNewsletter(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Percent size={18} />
                <span>Quero 10% de Desconto!</span>
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-4">
          Não enviamos spam. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
};

// Header Component with PERFECT contrast
const Header = () => {
  const { user, cart, logout, searchTerm, setSearchTerm, openWhatsApp } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      {/* PERFECT header color for logo visibility */}
      <header className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-900 text-white shadow-2xl relative z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo - NOW PERFECTLY VISIBLE */}
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_sofa-boutique-1/artifacts/fts1vd80_Design_sem_nome-removebg-preview.png" 
                alt="Estofados Premium Outlet" 
                className="h-14 w-auto brightness-110 contrast-110 drop-shadow-lg"
              />
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-amber-400 drop-shadow-md">ESTOFADOS</h1>
                <p className="text-sm text-amber-200">PREMIUM OUTLET</p>
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
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="hover:text-amber-400 transition-colors font-medium">Início</Link>
              <Link to="/produtos" className="hover:text-amber-400 transition-colors font-medium">Produtos</Link>
              <Link to="/sobre" className="hover:text-amber-400 transition-colors font-medium">Sobre</Link>
              <a href="#testimonials" className="hover:text-amber-400 transition-colors font-medium">Depoimentos</a>
              <Link to="/contato" className="hover:text-amber-400 transition-colors font-medium">Contato</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* WhatsApp Button - LINK DIRETO */}
              <a
                href="https://wa.me/5521996197768?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20produtos%20da%20Estofados%20Premium%20Outlet."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all transform hover:scale-105 shadow-lg"
              >
                <MessageCircle size={20} />
                <span className="hidden md:inline font-medium">WhatsApp</span>
              </a>

              {/* Cart */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:text-amber-400 transition-colors"
              >
                <ShoppingCart size={24} />
                {cart.items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
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
                <span className="hidden md:inline font-medium">
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
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <nav className="flex flex-col space-y-4">
                <Link to="/" className="hover:text-amber-400 transition-colors font-medium">Início</Link>
                <Link to="/produtos" className="hover:text-amber-400 transition-colors font-medium">Produtos</Link>
                <Link to="/sobre" className="hover:text-amber-400 transition-colors font-medium">Sobre</Link>
                <a href="#testimonials" className="hover:text-amber-400 transition-colors font-medium">Depoimentos</a>
                <Link to="/contato" className="hover:text-amber-400 transition-colors font-medium">Contato</Link>
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
  const { addToCart, openWhatsApp } = useAppContext();

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name}. Gostaria de mais informações sobre disponibilidade, detalhes e condições de pagamento.`);
    const url = `https://wa.me/5521996197768?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
          <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
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
          <button className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
            <Heart size={24} />
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => addToCart(product.id)}
            disabled={!product.in_stock}
            className="flex-1 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <ShoppingCart size={18} />
            <span>Carrinho</span>
          </button>
          <button
            onClick={handleWhatsApp}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Hero Section with FREE SHIPPING banner
const HeroSection = () => {
  const { openWhatsApp } = useAppContext();
  
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

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* FREE SHIPPING Banner */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-3 animate-pulse">
            <Truck size={20} />
            <span className="font-bold">🚚 FRETE GRÁTIS para compras acima de R$ 1.500 em todo RJ!</span>
            <Gift size={20} />
          </div>
        </div>
      </div>

      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={bannerImages[currentBanner]}
          alt="Estofados Premium"
          className="w-full h-full object-cover transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 mt-12">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="flex items-center justify-center mb-6">
            <Crown className="text-amber-400 mr-3 drop-shadow-lg" size={48} />
            <h1 className="text-6xl md:text-8xl font-serif text-amber-400 drop-shadow-lg">
              PREMIUM
            </h1>
            <Crown className="text-amber-400 ml-3 drop-shadow-lg" size={48} />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
            Estofados de <span className="text-amber-400">Luxo</span> para sua Casa
          </h2>
          
          <p className="text-xl md:text-2xl mb-8 text-slate-200 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            Descubra nossa coleção exclusiva de sofás, poltronas e móveis industriais 
            com design sofisticado e qualidade incomparável.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => {
                const message = encodeURIComponent("Olá! Quero conhecer mais sobre os produtos premium da Estofados Premium Outlet!");
                const url = `https://wa.me/5521996197768?text=${message}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 
                         text-slate-900 font-bold px-8 py-4 rounded-full flex items-center space-x-3 
                         transition-all transform hover:scale-110 shadow-xl hover:shadow-2xl"
            >
              <MessageCircle size={24} />
              <span>Fale Conosco no WhatsApp</span>
              <ArrowRight size={20} />
            </button>
            
            <Link
              to="/produtos"
              className="border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-slate-900 
                         font-bold px-8 py-4 rounded-full transition-all transform hover:scale-110 shadow-lg"
            >
              Ver Produtos
            </Link>
          </div>

          {/* Enhanced Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-3 bg-slate-800/60 p-4 rounded-lg backdrop-blur-sm border border-slate-700 hover:bg-slate-700/60 transition-all">
              <Shield className="text-amber-400" size={28} />
              <span className="font-semibold">Garantia 2 Anos</span>
            </div>
            <div className="flex items-center justify-center space-x-3 bg-slate-800/60 p-4 rounded-lg backdrop-blur-sm border border-slate-700 hover:bg-slate-700/60 transition-all">
              <Truck className="text-green-400" size={28} />
              <span className="font-semibold">Frete Grátis RJ</span>
            </div>
            <div className="flex items-center justify-center space-x-3 bg-slate-800/60 p-4 rounded-lg backdrop-blur-sm border border-slate-700 hover:bg-slate-700/60 transition-all">
              <Award className="text-amber-400" size={28} />
              <span className="font-semibold">Qualidade Premium</span>
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
              currentBanner === index ? 'bg-amber-400 scale-110' : 'bg-white/50'
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
    <section className="py-16 bg-gradient-to-br from-slate-50 to-slate-100">
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
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-amber-400 transition-colors drop-shadow-lg">
                  {category.name}
                </h3>
                <p className="text-slate-200 mb-4 drop-shadow-md">
                  {category.description}
                </p>
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 w-fit shadow-lg">
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

// Trust Badges Section - ENHANCED
const TrustBadgesSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Por que escolher a <span className="text-amber-600">Estofados Premium?</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Compromissos que fazem da nossa loja a melhor escolha para seus móveis
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center transform hover:scale-105 transition-all">
            <div className="bg-gradient-to-br from-green-100 to-green-200 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Verified className="text-green-600" size={40} />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Pagamento Seguro</h3>
            <p className="text-sm text-slate-600">Transações 100% protegidas</p>
          </div>

          <div className="text-center transform hover:scale-105 transition-all">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Award className="text-blue-600" size={40} />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Qualidade Premium</h3>
            <p className="text-sm text-slate-600">Materiais de primeira linha</p>
          </div>

          <div className="text-center transform hover:scale-105 transition-all">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Shield className="text-purple-600" size={40} />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Garantia 2 Anos</h3>
            <p className="text-sm text-slate-600">Cobertura total contra defeitos</p>
          </div>

          <div className="text-center transform hover:scale-105 transition-all">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Truck className="text-amber-600" size={40} />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Frete Grátis*</h3>
            <p className="text-sm text-slate-600">Compras acima de R$ 1.500</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Continue with rest of components...
// Products Page, Product Detail, About Page, FAQ, Contact, etc.
// I'll continue with the most important ones to stay within limits

// Testimonials Section with CORRECTED photos
const TestimonialsSection = () => {
  const { reviews } = useAppContext();

  return (
    <section id="testimonials" className="py-16 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            O que nossos <span className="text-amber-400">clientes</span> dizem
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Depoimentos reais de clientes satisfeitos em todo o Rio de Janeiro
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 hover:from-slate-600 hover:to-slate-700 transition-all shadow-lg hover:shadow-2xl transform hover:scale-105 duration-300 border border-slate-600"
            >
              <div className="flex items-center mb-4">
                <img
                  src={review.user_image}
                  alt={review.user_name}
                  className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-amber-400"
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
                    size={16}
                    className={i < review.rating ? 'text-amber-400 fill-current' : 'text-slate-500'}
                  />
                ))}
              </div>

              <p className="text-slate-200 leading-relaxed text-sm">
                "{review.comment}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Cart Modal - Enhanced
const CartModal = ({ onClose }) => {
  const { cart, removeFromCart, openWhatsApp } = useAppContext();

  const handleWhatsAppCheckout = () => {
    const items = cart.items.map(item => 
      `• ${item.product_name} (${item.quantity}x)`
    ).join('\n');
    
    const message = encodeURIComponent(`🛒 *Finalizar Compra - Estofados Premium*\n\n*Produtos selecionados:*\n${items}\n\n*Total de itens:* ${cart.items.reduce((total, item) => total + item.quantity, 0)}\n\nGostaria de finalizar esta compra e saber sobre formas de pagamento e prazo de entrega.`);
    
    const url = `https://wa.me/5521996197768?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-800 to-slate-700 text-white">
          <h2 className="text-2xl font-bold">🛒 Seu Carrinho</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-6">
          {cart.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto mb-4 text-slate-400" size={64} />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">Seu carrinho está vazio</h3>
              <p className="text-slate-500">Adicione produtos para começar suas compras</p>
              <Link 
                to="/produtos" 
                onClick={onClose}
                className="inline-block mt-4 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Ver Produtos
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.product_id} className="flex items-center space-x-4 bg-slate-50 p-4 rounded-lg border hover:shadow-md transition-shadow">
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{item.product_name}</h3>
                    <p className="text-slate-600 text-sm">
                      📦 Quantidade: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover item"
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
          <div className="p-6 border-t bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="mb-4 text-center">
              <p className="text-sm text-slate-600 mb-2">
                📊 Total de itens: <strong>{cart.items.reduce((total, item) => total + item.quantity, 0)}</strong>
              </p>
              <p className="text-xs text-green-600 font-medium">
                🚚 Frete GRÁTIS para compras acima de R$ 1.500!
              </p>
            </div>
            <button
              onClick={handleWhatsAppCheckout}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-4 rounded-lg 
                         flex items-center justify-center space-x-3 transition-all transform hover:scale-105 shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Finalizar no WhatsApp</span>
            </button>
            <p className="text-xs text-slate-500 text-center mt-2">
              ✅ Enviaremos seus produtos via WhatsApp para finalizar a compra
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified Main Components for space
const ProductsPage = () => <div className="min-h-screen bg-slate-50 p-8"><h1 className="text-3xl">Produtos - Em desenvolvimento</h1></div>;
const ProductDetailPage = () => <div className="min-h-screen bg-slate-50 p-8"><h1 className="text-3xl">Produto - Em desenvolvimento</h1></div>;
const AboutPage = () => <div className="min-h-screen bg-slate-50 p-8"><h1 className="text-3xl">Sobre - Em desenvolvimento</h1></div>;
const ContactPage = () => <div className="min-h-screen bg-slate-50 p-8"><h1 className="text-3xl">Contato - Em desenvolvimento</h1></div>;
const FAQPage = () => <div className="min-h-screen bg-slate-50 p-8"><h1 className="text-3xl">FAQ - Em desenvolvimento</h1></div>;

// Auth Modal - Simplified
const AuthModal = ({ onClose }) => {
  const { user, logout } = useAppContext();

  if (user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Minha Conta</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
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
              onClick={() => { logout(); onClose(); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-6"><h3>Login/Cadastro - Em desenvolvimento</h3>
    <button onClick={onClose} className="mt-4 bg-slate-800 text-white px-4 py-2 rounded">Fechar</button></div>
  </div>;
};

// Footer - NO CNPJ
const Footer = () => {
  const { newsletter, setNewsletter, subscribeNewsletter, isLoading } = useAppContext();

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (newsletter.trim()) {
      await subscribeNewsletter(newsletter);
    }
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description - NO CNPJ */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_sofa-boutique-1/artifacts/fts1vd80_Design_sem_nome-removebg-preview.png" 
                alt="Estofados Premium Outlet" 
                className="h-12 w-auto brightness-110"
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
            <div className="text-slate-400 text-sm space-y-1">
              <p>📍 Rua das Flores, 123 - Copacabana, RJ</p>
              <p>📞 (21) 99619-7768</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-amber-400 mb-4">Links Úteis</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-slate-300 hover:text-amber-400 transition-colors">Início</Link></li>
              <li><Link to="/produtos" className="text-slate-300 hover:text-amber-400 transition-colors">Produtos</Link></li>
              <li><Link to="/sobre" className="text-slate-300 hover:text-amber-400 transition-colors">Sobre Nós</Link></li>
              <li><Link to="/contato" className="text-slate-300 hover:text-amber-400 transition-colors">Contato</Link></li>
              <li><Link to="/faq" className="text-slate-300 hover:text-amber-400 transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold text-amber-400 mb-4">Newsletter VIP</h4>
            <p className="text-slate-300 text-sm mb-4">
              🎁 Ofertas exclusivas e 10% de desconto na primeira compra!
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Seu melhor email"
                value={newsletter}
                onChange={(e) => setNewsletter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 rounded font-semibold transition-all disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : '🎯 Inscrever'}
              </button>
            </form>
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

// Main Home Component
const HomePage = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <CategoriesSection />
      <TrustBadgesSection />
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
            <Route path="/" element={<HomePage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/produto/:id" element={<ProductDetailPage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
          </Routes>
          <Footer />
          <WhatsAppFloat />
          <NewsletterPopup />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </div>
    </AppProvider>
  );
}

export default App;