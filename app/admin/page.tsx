"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type MeResponse = {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

const authApiBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_URL ?? "http://localhost:4001"

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse["user"] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      try {
        const response = await fetch(`${authApiBaseUrl}/auth/me`, {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("No se encontro una sesion activa")
        }

        const data = (await response.json()) as MeResponse
        if (!isMounted) {
          return
        }

        setUser(data.user)
      } catch {
        if (isMounted) {
          setError("Debes iniciar sesion para acceder al panel de administracion")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    await fetch(`${authApiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
    router.push("/")
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Validando acceso...
      </main>
    )
  }

  if (error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/")}>Volver al login</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-xl border-border/60 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle>Panel de Administracion</CardTitle>
          <CardDescription>Sesion autenticada desde el backend de microservicios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">{user.name}</p>
            <p>{user.email}</p>
            <p>Rol: {user.role}</p>
          </div>
          <Button className="w-full" variant="outline" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
