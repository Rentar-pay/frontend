"use client"
import React, { Component, type ReactNode, type ErrorInfo } from "react"
import { ErrorState } from "@/components/ui/error-state"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKey?: string | number
}

interface State {
  hasError: boolean
  error?: Error
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("DashboardErrorBoundary caught an error:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.resetKey !== undefined && prevProps.resetKey !== this.props.resetKey) {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: undefined })
      }
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <ErrorState
          message={this.state.error?.message || "An unexpected error occurred in this section."}
          onRetry={this.resetErrorBoundary}
        />
      )
    }

    return this.props.children
  }
}
