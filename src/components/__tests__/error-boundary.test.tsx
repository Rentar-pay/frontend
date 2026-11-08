import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import React, { useState } from "react"
import { DashboardErrorBoundary } from "@/components/shared/error-boundary"

function ProblematicChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Simulated dashboard rendering failure")
  }
  return <div>Healthy Dashboard Content</div>
}

function TestContainer() {
  const [hasError, setHasError] = useState(true)
  return (
    <div>
      <button onClick={() => setHasError(false)}>Fix Error</button>
      <DashboardErrorBoundary>
        <ProblematicChild shouldThrow={hasError} />
      </DashboardErrorBoundary>
    </div>
  )
}

describe("DashboardErrorBoundary", () => {
  it("renders healthy children normally", () => {
    render(
      <DashboardErrorBoundary>
        <div>Normal Section Content</div>
      </DashboardErrorBoundary>
    )
    expect(screen.getByText("Normal Section Content")).toBeInTheDocument()
  })

  it("catches render errors and renders friendly error UI with retry action", () => {
    // Suppress console.error in test output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <DashboardErrorBoundary>
        <ProblematicChild shouldThrow={true} />
      </DashboardErrorBoundary>
    )

    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(screen.getByText("Simulated dashboard rendering failure")).toBeInTheDocument()
    expect(screen.getByText("Try again")).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it("allows recovery when error is resolved and retry is clicked", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    render(<TestContainer />)

    expect(screen.getByText("Something went wrong")).toBeInTheDocument()

    // Trigger state change so child stops throwing
    fireEvent.click(screen.getByText("Fix Error"))
    // Click Try again on ErrorState
    fireEvent.click(screen.getByText("Try again"))

    expect(screen.getByText("Healthy Dashboard Content")).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it("invokes onError callback with error info", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const onError = vi.fn()

    render(
      <DashboardErrorBoundary onError={onError}>
        <ProblematicChild shouldThrow={true} />
      </DashboardErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Simulated dashboard rendering failure" }),
      expect.any(Object)
    )

    consoleSpy.mockRestore()
  })
})
