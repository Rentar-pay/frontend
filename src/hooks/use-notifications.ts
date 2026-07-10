import { useEffect, useState } from "react"

export interface Notification {
  id: string
  title: string
  message: string
  type: "warning" | "success" | "info" | "error"
  read: boolean
  createdAt: string
}

export function useNotifications() {
  const [data, setData] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/notifications")
        if (!response.ok) throw new Error("Failed to fetch notifications")
        const notifications = await response.json()
        setData(notifications)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  return { data, isLoading, error }
}
