"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, ChefHat, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

const authApiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_URL ?? "http://localhost:4001"

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      setErrorMessage(null)

      const response = await fetch(`${authApiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message ?? "No fue posible iniciar sesion")
      }

      router.push("/admin")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible iniciar sesion")
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Logo y título */}
      <div className="mb-8 text-center">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/20" />
          <div className="absolute inset-2 rounded-xl border border-primary/50 bg-card/80 backdrop-blur-sm" />
          <ChefHat className="relative z-10 h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          <span className="text-primary">AR</span> Gastro
        </h1>
        <p className="text-sm text-muted-foreground">
          Panel de Administración
        </p>
      </div>

      {/* Card del formulario */}
      <div className="relative">
        {/* Efecto de borde brillante */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 opacity-50 blur-sm" />
        
        <div className="relative rounded-2xl border border-border/50 bg-card/90 p-8 backdrop-blur-xl">
          {/* Indicador AR */}
          <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Scan className="h-4 w-4 animate-pulse text-primary" />
            <span>Sistema de autenticación seguro</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@argastro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-12 border-border/50 bg-input pl-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 border-border/50 bg-input pl-11 pr-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Recordar y olvidé */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Recordarme
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón de login */}
            <Button
              type="submit"
              disabled={isLoading}
              className="relative h-12 w-full overflow-hidden bg-primary text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Verificando...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Iniciar Sesión
                </span>
              )}
            </Button>

            {errorMessage ? (
              <p className="text-sm text-red-500" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </form>

          {/* Separador */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground">o continúa con</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {/* Botón de acceso biométrico */}
          <Button
            variant="outline"
            className="h-12 w-full border-border/50 bg-secondary/50 text-foreground transition-all hover:border-accent hover:bg-secondary"
          >
            <svg
              className="mr-2 h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04c.918-2.328 1.445-4.878 1.445-7.531 0-3.866 3.134-7 7-7s7 3.134 7 7a17.29 17.29 0 01-.845 5.275M9 11a3 3 0 116 0M12 11v0a9 9 0 018.485 6.019" />
            </svg>
            Acceso Biométrico
          </Button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Protegido con cifrado de extremo a extremo
        <br />
        <span className="text-primary">AR Gastro</span> © 2026 • Todos los derechos reservados
      </p>
    </div>
  )
}
