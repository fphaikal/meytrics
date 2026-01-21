import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';
import {
  Card,
  CardBody,
  Button,
  Input,
  Link
} from "@heroui/react";
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Initialize theme to ensure it matches user preference/dashboard state
  useTheme();

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left Side - Hero / Branding */}
      <div className="relative hidden lg:flex flex-col items-center justify-center p-12 bg-vulcan-950 overflow-hidden">
        {/* Abstract Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-purple-500/20" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="relative z-10 text-center space-y-6 max-w-lg">
          <div className="flex justify-center mb-8">
            {/* <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-primary-500/20">
              <span className="text-4xl font-bold text-white">M</span>
            </div> */}
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Multi-Endpoint Yield Tracking Resources In Cloud Systems
          </h1>
          <p className="text-vulcan-300 text-lg leading-relaxed">
            Real-time monitoring, instant alerts, and detailed analytics for your critical services.
            Stay ahead of downtime with Meytrics.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-black-pearl-950">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-default-500 mt-2">Please sign in to access your dashboard</p>
          </div>

          <Card className="border border-default-100 shadow-xl dark:bg-black-pearl-900/50 backdrop-blur-sm">
            <CardBody className="p-8 gap-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {error && (
                  <div className="bg-danger-50 border border-danger-100 text-danger px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>
                    {error}
                  </div>
                )}

                <Input
                  label="Username"
                  labelPlacement="outside"
                  placeholder="Enter your username"
                  startContent={<User className="text-default-400 pointer-events-none flex-shrink-0 w-4 h-4" />}
                  value={username}
                  onValueChange={setUsername}
                  isRequired
                  variant="bordered"
                  classNames={{
                    inputWrapper: "bg-default-50 border-default-200 hover:border-primary focus-within:!border-primary transition-colors",
                  }}
                />

                <div className="space-y-1">
                  <Input
                    label="Password"
                    labelPlacement="outside"
                    placeholder="Enter your password"
                    startContent={<Lock className="text-default-400 pointer-events-none flex-shrink-0 w-4 h-4" />}
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                        {isVisible ? (
                          <EyeOff className="text-2xl text-default-400 pointer-events-none w-4 h-4" />
                        ) : (
                          <Eye className="text-2xl text-default-400 pointer-events-none w-4 h-4" />
                        )}
                      </button>
                    }
                    type={isVisible ? "text" : "password"}
                    value={password}
                    onValueChange={setPassword}
                    isRequired
                    variant="bordered"
                    classNames={{
                      inputWrapper: "bg-default-50 border-default-200 hover:border-primary focus-within:!border-primary transition-colors",
                    }}
                  />
                </div>

                <Button
                  color="primary"
                  type="submit"
                  isLoading={loading}
                  className="w-full font-medium shadow-lg shadow-primary/20"
                  size="lg"
                  endContent={!loading && <ArrowRight className="w-4 h-4" />}
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>
              </form>
            </CardBody>
          </Card>

          <div className="text-center">
            <Link href="/" size="sm" className="text-default-500 hover:text-primary transition-colors gap-1">
              ← Back to Status Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
