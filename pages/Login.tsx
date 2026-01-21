import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, UserPlus, Eye, EyeOff, CheckCircle, X, Sparkles, Building2, Users, Briefcase } from 'lucide-react';
import { UserRole } from '../types';
import PalantirLoader from '../components/PalantirLoader';

const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, register, isLoading, error, clearError } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'Analyst' as UserRole,
    organization: '',
    department: ''
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [rememberMe, setRememberMe] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  // Load remembered email and preferences on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('ecoinvest_remembered_email');
    if (rememberedEmail && !isRegisterMode) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    
    // Check if "Keep me signed in" was previously enabled
    const wasKeepSignedIn = localStorage.getItem('ecoinvest_keep_signed_in') === 'true';
    if (wasKeepSignedIn) {
      setKeepSignedIn(true);
    }

  }, [isRegisterMode]);

  // Update remembered email when rememberMe changes
  useEffect(() => {
    if (!rememberMe && !isRegisterMode) {
      localStorage.removeItem('ecoinvest_remembered_email');
    } else if (rememberMe && email && !isRegisterMode) {
      localStorage.setItem('ecoinvest_remembered_email', email);
    }
  }, [rememberMe, email, isRegisterMode]);

  // Clear form when switching modes
  useEffect(() => {
    if (isRegisterMode) {
      setEmail('');
      setPassword('');
    } else {
      // Restore remembered email when switching back to login
      const rememberedEmail = localStorage.getItem('ecoinvest_remembered_email');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
      setRegisterData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'Analyst' as UserRole,
        organization: '',
        department: ''
      });
      setPasswordErrors([]);
    }
    clearError();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  }, [isRegisterMode]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('One number');
    return errors;
  };

  const handlePasswordChange = (value: string) => {
    setRegisterData(prev => ({ ...prev, password: value }));
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoginSuccess(false);

    if (isRegisterMode) {
      if (registerData.password !== registerData.confirmPassword) {
        return;
      }
      if (passwordErrors.length > 0) {
        return;
      }

      try {
        await register({
          email: registerData.email,
          password: registerData.password,
          name: registerData.name,
          role: registerData.role,
          organization: registerData.organization || undefined,
          department: registerData.department || undefined
        }, rememberMe, keepSignedIn);
        setLoginSuccess(true);
        setTimeout(() => {
          setIsRegisterMode(false);
          setEmail(registerData.email);
        }, 1500);
      } catch (err) {
        // Error handled in context
      }
    } else {
      try {
        await login(email, password, rememberMe, keepSignedIn);
        setLoginSuccess(true);
      } catch (err) {
        // Error handled in context
      }
    }
  };

  const getPasswordStrength = (pwd: string): { strength: 'weak' | 'medium' | 'strong'; color: string } => {
    const errors = validatePassword(pwd);
    const remaining = 4 - errors.length;
    if (remaining <= 1) return { strength: 'weak', color: 'red' };
    if (remaining <= 2) return { strength: 'medium', color: 'amber' };
    return { strength: 'strong', color: 'emerald' };
  };

  const roleIcons: Record<UserRole, React.ReactNode> = {
    Analyst: <Briefcase size={16} />,
    Manager: <Users size={16} />,
    Viewer: <Eye size={16} />,
    Admin: <ShieldCheck size={16} />
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-black overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        ></div>
        <style>{`
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
        `}</style>
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-black via-[#0a0a0a] to-black"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#00ff88]/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00a8ff]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md z-10 p-6">
        <div className={`bg-[#0a0a0a] rounded-xl shadow-2xl overflow-hidden border border-[#1a1a1a] transition-all duration-500 ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0a0a0a] via-[#111111] to-[#0a0a0a] p-8 text-center border-b border-[#1a1a1a] relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, #00ff88 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}></div>
            </div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-[#00ff88] to-[#00a8ff] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00ff88]/30 relative">
                <ShieldCheck className="w-10 h-10 text-[#0a0a0a]" />
                {/* Glow effect */}
                <div className="absolute inset-0 bg-[#00ff88] rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight font-mono uppercase mb-2">
                ECOINVEST
              </h1>
              <p className="text-[#666666] text-xs font-mono uppercase tracking-widest mt-2">
                DNSH EVALUATION PLATFORM
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1a1a1a] bg-[#111111]">
            <button
              onClick={() => {
                setIsRegisterMode(false);
                clearError();
              }}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-300 font-mono uppercase tracking-wider relative ${
                !isRegisterMode
                  ? 'text-[#00ff88] bg-[#0a0a0a]'
                  : 'text-[#666666] hover:text-white hover:bg-[#0f0f0f]'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <Lock size={16} />
                <span>SIGN IN</span>
              </span>
              {!isRegisterMode && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent"></div>
              )}
            </button>
            <button
              onClick={() => {
                setIsRegisterMode(true);
                clearError();
              }}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-300 font-mono uppercase tracking-wider relative ${
                isRegisterMode
                  ? 'text-[#00ff88] bg-[#0a0a0a]'
                  : 'text-[#666666] hover:text-white hover:bg-[#0f0f0f]'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <UserPlus size={16} />
                <span>REGISTER</span>
              </span>
              {isRegisterMode && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00ff88] to-transparent"></div>
              )}
            </button>
          </div>

          {/* Form */}
          <div className="p-8 bg-[#0a0a0a]">
            {loginSuccess && !error && (
              <div className="mb-6 p-4 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg flex items-center space-x-3 animate-fadeIn">
                <CheckCircle className="text-[#00ff88] flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#00ff88] font-mono uppercase">
                    {isRegisterMode ? 'Account Created Successfully' : 'Authentication Successful'}
                  </p>
                  <p className="text-xs text-[#666666] mt-1">
                    {isRegisterMode ? 'Redirecting to login...' : 'Initializing session...'}
                  </p>
                </div>
                <PalantirLoader size="sm" variant="minimal" />
              </div>
            )}

            {error && (
              <div className="mb-6 flex items-start p-4 bg-red-500/10 border-l-4 border-red-500 text-red-400 rounded text-sm animate-fadeIn">
                <AlertCircle size={18} className="mr-3 flex-shrink-0 mt-0.5" />
                <span className="flex-1 font-mono text-xs">{error}</span>
                <button
                  type="button"
                  onClick={clearError}
                  className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {isLoading && !loginSuccess ? (
              <div className="py-12">
                <PalantirLoader 
                  size="lg" 
                  text={isRegisterMode ? "CREATING_ACCOUNT" : "AUTHENTICATING"} 
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {isRegisterMode ? (
                  <>
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        FULL NAME *
                      </label>
                      <input
                        type="text"
                        value={registerData.name}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                        className="block w-full px-4 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        EMAIL ADDRESS *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-[#666666]" />
                        </div>
                        <input
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                          className="block w-full pl-12 pr-4 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="name@company.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        ROLE *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          {roleIcons[registerData.role]}
                        </div>
                        <select
                          value={registerData.role}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                          className="block w-full pl-12 pr-4 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm appearance-none cursor-pointer"
                          required
                        >
                          <option value="Analyst">Analyst</option>
                          <option value="Manager">Manager</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <ArrowRight className="h-4 w-4 text-[#666666] rotate-90" />
                        </div>
                      </div>
                      <p className="text-xs text-[#666666] mt-1 font-mono">Admin accounts require approval</p>
                    </div>

                    {/* Organization */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        ORGANIZATION
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-[#666666]" />
                        </div>
                        <input
                          type="text"
                          value={registerData.organization}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, organization: e.target.value }))}
                          className="block w-full pl-12 pr-4 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="EcoInvest"
                        />
                      </div>
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        DEPARTMENT
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-[#666666]" />
                        </div>
                        <input
                          type="text"
                          value={registerData.department}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, department: e.target.value }))}
                          className="block w-full pl-12 pr-4 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="Risk Assessment"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        PASSWORD *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-[#666666]" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={registerData.password}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          className="block w-full pl-12 pr-12 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#666666] hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {registerData.password && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  getPasswordStrength(registerData.password).color === 'red' ? 'bg-red-500' :
                                  getPasswordStrength(registerData.password).color === 'amber' ? 'bg-[#ffb800]' :
                                  'bg-[#00ff88]'
                                }`}
                                style={{ width: `${((4 - passwordErrors.length) / 4) * 100}%` }}
                              />
                            </div>
                            <span className={`ml-3 text-xs font-bold font-mono uppercase ${
                              getPasswordStrength(registerData.password).color === 'red' ? 'text-red-400' :
                              getPasswordStrength(registerData.password).color === 'amber' ? 'text-[#ffb800]' :
                              'text-[#00ff88]'
                            }`}>
                              {getPasswordStrength(registerData.password).strength}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number'].map(req => {
                              const isValid = !passwordErrors.includes(req);
                              return (
                                <div key={req} className={`flex items-center font-mono text-xs ${
                                  isValid ? 'text-[#00ff88]' : 'text-[#666666]'
                                }`}>
                                  {isValid ? (
                                    <CheckCircle size={12} className="mr-2 flex-shrink-0" />
                                  ) : (
                                    <X size={12} className="mr-2 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{req}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        CONFIRM PASSWORD *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-[#666666]" />
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className={`block w-full pl-12 pr-12 py-3 bg-[#111111] border rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 sm:text-sm font-mono transition-all ${
                            registerData.confirmPassword && registerData.password !== registerData.confirmPassword
                              ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                              : 'border-[#1a1a1a] focus:ring-[#00ff88]/50 focus:border-[#00ff88]'
                          }`}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#666666] hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                        <p className="mt-2 text-xs text-red-400 font-mono">Passwords do not match</p>
                      )}
                    </div>

                    {/* Remember Me & Keep Signed In for Registration */}
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 border-2 rounded transition-all flex items-center justify-center ${
                          rememberMe 
                            ? 'bg-[#00ff88] border-[#00ff88]' 
                            : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                        }`}>
                          {rememberMe && <CheckCircle size={12} className="text-[#0a0a0a]" />}
                        </div>
                        <span className="ml-2 text-xs text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                          Remember email
                        </span>
                      </label>
                      
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={keepSignedIn}
                          onChange={(e) => setKeepSignedIn(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 border-2 rounded transition-all flex items-center justify-center ${
                          keepSignedIn 
                            ? 'bg-[#00ff88] border-[#00ff88]' 
                            : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                        }`}>
                          {keepSignedIn && <CheckCircle size={12} className="text-[#0a0a0a]" />}
                        </div>
                        <span className="ml-2 text-xs text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                          Keep me signed in
                        </span>
                        <span className="ml-2 text-[10px] text-[#666666] font-mono">
                          (30 days)
                        </span>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        EMAIL ADDRESS
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-[#666666]" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-12 pr-4 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="name@company.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-[#999999] mb-2 font-mono uppercase tracking-wider">
                        PASSWORD
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-[#666666]" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-12 pr-12 py-3 bg-[#111111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all font-mono text-sm"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#666666] hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* Remember Me & Keep Signed In */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 border-2 rounded transition-all flex items-center justify-center ${
                            rememberMe 
                              ? 'bg-[#00ff88] border-[#00ff88]' 
                              : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                          }`}>
                            {rememberMe && <CheckCircle size={12} className="text-[#0a0a0a]" />}
                          </div>
                          <span className="ml-2 text-xs text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                            Remember email
                          </span>
                        </label>
                        <a href="#" className="text-xs font-medium text-[#00ff88] hover:text-[#00ff88]/80 transition-colors font-mono uppercase">
                          Forgot password?
                        </a>
                      </div>
                      
                      {/* Keep Signed In */}
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={keepSignedIn}
                          onChange={(e) => setKeepSignedIn(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 border-2 rounded transition-all flex items-center justify-center ${
                          keepSignedIn 
                            ? 'bg-[#00ff88] border-[#00ff88]' 
                            : 'bg-[#111111] border-[#1a1a1a] group-hover:border-[#00ff88]/50'
                        }`}>
                          {keepSignedIn && <CheckCircle size={12} className="text-[#0a0a0a]" />}
                        </div>
                        <span className="ml-2 text-xs text-[#999999] font-mono uppercase tracking-wider group-hover:text-white transition-colors">
                          Keep me signed in
                        </span>
                        <span className="ml-2 text-[10px] text-[#666666] font-mono">
                          (30 days)
                        </span>
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (isRegisterMode && (passwordErrors.length > 0 || registerData.password !== registerData.confirmPassword))}
                  className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-lg shadow-lg text-sm font-bold text-[#0a0a0a] bg-gradient-to-r from-[#00ff88] to-[#00a8ff] hover:from-[#00e673] hover:to-[#0099e6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00ff88]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    {isRegisterMode ? 'CREATE ACCOUNT' : 'SIGN IN'}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              </form>
            )}

            {/* Google Sign In Button */}
            {!isRegisterMode && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#1a1a1a]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 bg-[#0a0a0a] text-[#666666] font-mono tracking-wider">OR</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      clearError();
                      setLoginSuccess(false);
                      await loginWithGoogle(rememberMe, keepSignedIn);
                      setLoginSuccess(true);
                      setTimeout(() => {
                        setLoginSuccess(false);
                      }, 2000);
                    } catch (err) {
                      // Error is handled in context
                      // Silently handle - error state is managed by AuthContext
                    }
                  }}
                  disabled={isLoading}
                  className="mt-4 w-full flex justify-center items-center py-3 px-6 border border-[#1a1a1a] rounded-lg shadow-sm text-sm font-medium text-white bg-[#111111] hover:bg-[#1a1a1a] hover:border-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00ff88]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider group relative overflow-hidden"
                >
                  {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{
                      animation: 'shimmer 2s infinite',
                      backgroundSize: '200% 100%'
                    }}></div>
                  )}
                  <svg className="w-5 h-5 mr-3 flex-shrink-0 relative z-10" viewBox="0 0 24 24" fill="none">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="relative z-10 text-white group-hover:text-[#00ff88] transition-colors">
                    {isLoading ? 'AUTHENTICATING...' : 'CONTINUE WITH GOOGLE'}
                  </span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
