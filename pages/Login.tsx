
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Loader2, UserPlus, Eye, EyeOff, CheckCircle, X } from 'lucide-react';
import { UserRole } from '../types';

const LoginPage: React.FC = () => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('analyst@ecoinvest.com');
  const [password, setPassword] = useState('demo123');
  
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

    if (isRegisterMode) {
      // Registration
      if (registerData.password !== registerData.confirmPassword) {
        clearError();
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
        });
      } catch (err) {
        // Error handled in context
      }
    } else {
      // Login
      try {
        await login(email, password);
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

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-slate-900 overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img 
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
            alt="World Map Tech" 
            className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/60"></div>
      </div>

      <div className="w-full max-w-md z-10 p-6">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
          {/* Header */}
          <div className="bg-[#162032] p-8 text-center border-b border-slate-700">
             <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-10 h-10 text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-tight">EcoInvest DNSH</h1>
             <p className="text-slate-400 text-sm mt-2">Sustainable Finance Evaluation Platform</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => {
                setIsRegisterMode(false);
                clearError();
              }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                !isRegisterMode
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegisterMode(true);
                clearError();
              }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                isRegisterMode
                  ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus size={16} className="inline mr-1" />
              Register
            </button>
          </div>

          {/* Form */}
          <div className="p-8 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm animate-fadeIn">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={clearError}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {isRegisterMode ? (
                <>
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                      className="block w-full px-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        placeholder="name@company.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                    <select
                      value={registerData.role}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="block w-full px-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      required
                    >
                      <option value="Analyst">Analyst</option>
                      <option value="Manager">Manager</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Admin accounts require approval</p>
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Organization</label>
                    <input
                      type="text"
                      value={registerData.organization}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, organization: e.target.value }))}
                      className="block w-full px-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="EcoInvest"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                    <input
                      type="text"
                      value={registerData.department}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, department: e.target.value }))}
                      className="block w-full px-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="Risk Assessment"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={registerData.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {registerData.password && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                getPasswordStrength(registerData.password).color === 'red' ? 'bg-red-500' :
                                getPasswordStrength(registerData.password).color === 'amber' ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${((4 - passwordErrors.length) / 4) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            getPasswordStrength(registerData.password).color === 'red' ? 'text-red-600' :
                            getPasswordStrength(registerData.password).color === 'amber' ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            {getPasswordStrength(registerData.password).strength.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number'].map(req => {
                            const isValid = !passwordErrors.includes(req);
                            return (
                              <div key={req} className={`flex items-center ${isValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isValid ? <CheckCircle size={12} className="mr-1" /> : <X size={12} className="mr-1" />}
                                {req}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className={`block w-full pl-10 pr-10 py-3 border rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm ${
                          registerData.confirmPassword && registerData.password !== registerData.confirmPassword
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                        }`}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-shadow"
                        placeholder="name@company.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-shadow"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-500">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <a href="#" className="font-medium text-emerald-600 hover:text-emerald-500">
                        Forgot password?
                      </a>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading || (isRegisterMode && (passwordErrors.length > 0 || registerData.password !== registerData.confirmPassword))}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        {isRegisterMode ? 'Creating account...' : 'Signing in...'}
                    </>
                ) : (
                    <>
                        {isRegisterMode ? 'Create Account' : 'Sign In'} <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
              </button>
            </form>

            {!isRegisterMode && (
              <div className="mt-6 text-center">
                 <p className="text-xs text-slate-400">
                    Protected by Enterprise Grade Security. <br/>
                    <span className="text-slate-300">Demo: analyst@ecoinvest.com / demo123</span>
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
