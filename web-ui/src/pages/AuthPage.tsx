import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { login, register } from '../services/auth-endpoints';
import { toast, Toaster } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function AuthPage() {
  const { user, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register Form State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'Shipper' | 'Carrier'>('Shipper');
  
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await login(loginEmail, loginPassword);
      if (success) {
        toast.success("Welcome back!");
        await checkAuth(); 
        navigate('/');
      } else {
        toast.error("Invalid credentials.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await register(regEmail, regPassword, regRole);
      if (success) {
        toast.success("Account created successfully. Please sign in.");
      } else {
        toast.error("Registration failed.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30">
      <Toaster position="top-center" richColors theme="dark" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 mb-4">
          <span className="text-white font-bold text-2xl">F</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          FreightMatch
        </h2>
        <p className="text-slate-400">
          The intelligent logistics ecosystem.
        </p>
      </div>

      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign In</TabsTrigger>
          <TabsTrigger value="register">Create Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <Card className="bg-slate-900 border-slate-800 text-slate-200 shadow-xl mt-4">
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription className="text-slate-400">
                Sign in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="mail@example.com" 
                    required 
                    className="bg-slate-950 border-slate-800 placeholder:text-slate-500"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input 
                    id="login-password" 
                    type="password" 
                    required 
                    className="bg-slate-950 border-slate-800 placeholder:text-slate-500"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="register">
           <Card className="bg-slate-900 border-slate-800 text-slate-200 shadow-xl mt-4">
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription className="text-slate-400">
                Join the ecosystem securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label>I am signing up as a:</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRegRole('Shipper')}
                      className={`py-3 px-4 text-sm font-medium rounded-lg border flex flex-col items-center gap-2 transition-all duration-300 ${
                        regRole === 'Shipper' 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-900'
                      }`}
                    >
                      <span className="text-2xl">📦</span>
                      Shipper
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('Carrier')}
                      className={`py-3 px-4 text-sm font-medium rounded-lg border flex flex-col items-center gap-2 transition-all duration-300 ${
                        regRole === 'Carrier' 
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-900'
                      }`}
                    >
                      <span className="text-2xl">🚛</span>
                      Carrier
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input 
                    id="reg-email" 
                    type="email" 
                    placeholder="mail@example.com" 
                    required 
                    className="bg-slate-950 border-slate-800 placeholder:text-slate-500"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input 
                    id="reg-password" 
                    type="password" 
                    required 
                    className="bg-slate-950 border-slate-800 placeholder:text-slate-500"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
