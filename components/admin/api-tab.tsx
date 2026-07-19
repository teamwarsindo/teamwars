"use client"

import { useState, useEffect } from "react"
import { ApiHeader } from "./api-header"
import { ApiRouteList } from "./api-route-list"
import { ApiTerminal } from "./api-terminal"
import { ApiConfirmModal } from "./api-confirm-modal"

export function ApiTab() {
  const [routes, setRoutes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string>("")
  const [isTesting, setIsTesting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    fetch("/api/admin/scan-endpoints")
      .then((res) => res.json())
      .then((data) => data.success && setRoutes(data.routes))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

  const executeApi = async () => {
    setShowConfirmModal(false); setIsTesting(true); setTestResult("Mengeksekusi request..."); setIsCopied(false);
    try {
      const res = await fetch(selectedRoute!)
      const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : await res.text()
      setTestResult(typeof data === "string" ? data : JSON.stringify(data, null, 2))
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(testResult)
    setIsCopied(true); setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <>
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ApiHeader count={routes.length} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <ApiRouteList routes={routes} isLoading={isLoading} selectedRoute={selectedRoute} onSelect={(r) => { setSelectedRoute(r); setTestResult(""); setIsCopied(false); }} />
          <ApiTerminal selectedRoute={selectedRoute} testResult={testResult} isTesting={isTesting} isCopied={isCopied} onRun={() => setShowConfirmModal(true)} onCopy={handleCopy} />
        </div>
      </div>
      {showConfirmModal && <ApiConfirmModal route={selectedRoute!} onCancel={() => setShowConfirmModal(false)} onConfirm={executeApi} />}
    </>
  )
}
