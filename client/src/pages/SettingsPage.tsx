import { useState } from "react"
import { Globe, Mail, Truck, Bell, Database, Key, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [settings, setSettings] = useState({
    // Tracking settings
    trackingMode: "manual", // manual, api, both
    autoUpdateStatus: true,
    notifyOnDelivery: true,
    notifyOnException: true,

    // API Integrations
    fedexApiKey: "",
    dhlApiKey: "",
    upsApiKey: "",

    // Email settings
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    resendApiKey: "",

    // General
    companyName: "Navarro Shipping",
    defaultWeightUnit: "kg",
    defaultDimensionUnit: "cm",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggleChange = (name: string) => {
    setSettings((prev) => ({ ...prev, [name]: !prev[name as keyof typeof prev] }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({
      title: "Settings saved",
      description: "Your configuration has been updated",
    })
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your shipping system</p>
      </div>

      {/* Tracking Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle>Tracking Configuration</CardTitle>
          </div>
          <CardDescription>
            How tracking updates are handled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trackingMode">Tracking Update Mode</Label>
            <Select
              value={settings.trackingMode}
              onValueChange={(v) => handleSelectChange("trackingMode", v)}
            >
              <SelectTrigger id="trackingMode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Only</SelectItem>
                <SelectItem value="api">API Integration Only</SelectItem>
                <SelectItem value="both">Both (Manual + API)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how tracking updates are received. Manual requires staff input, API pulls from carriers automatically.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoUpdateStatus">Auto-update shipment status</Label>
              <p className="text-xs text-muted-foreground">
                Automatically update status based on tracking events
              </p>
            </div>
            <Button
              type="button"
              variant={settings.autoUpdateStatus ? "default" : "outline"}
              size="sm"
              onClick={() => handleToggleChange("autoUpdateStatus")}
            >
              {settings.autoUpdateStatus ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyOnDelivery">Delivery notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send email when package is delivered
              </p>
            </div>
            <Button
              type="button"
              variant={settings.notifyOnDelivery ? "default" : "outline"}
              size="sm"
              onClick={() => handleToggleChange("notifyOnDelivery")}
            >
              {settings.notifyOnDelivery ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyOnException">Exception alerts</Label>
              <p className="text-xs text-muted-foreground">
                Send alert when shipment has issues
              </p>
            </div>
            <Button
              type="button"
              variant={settings.notifyOnException ? "default" : "outline"}
              size="sm"
              onClick={() => handleToggleChange("notifyOnException")}
            >
              {settings.notifyOnException ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Carrier API Integrations</CardTitle>
          </div>
          <CardDescription>
            Connect to shipping carriers for automatic tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fedexApiKey">FedEx API Key</Label>
            <Input
              id="fedexApiKey"
              name="fedexApiKey"
              type="password"
              placeholder="Enter FedEx API key"
              value={settings.fedexApiKey}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dhlApiKey">DHL API Key</Label>
            <Input
              id="dhlApiKey"
              name="dhlApiKey"
              type="password"
              placeholder="Enter DHL API key"
              value={settings.dhlApiKey}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upsApiKey">UPS API Key</Label>
            <Input
              id="upsApiKey"
              name="upsApiKey"
              type="password"
              placeholder="Enter UPS API key"
              value={settings.upsApiKey}
              onChange={handleChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Configuration</CardTitle>
          </div>
          <CardDescription>
            SMTP settings for sending notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Host</Label>
              <Input
                id="smtpHost"
                name="smtpHost"
                placeholder="smtp.gmail.com"
                value={settings.smtpHost}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input
                id="smtpPort"
                name="smtpPort"
                placeholder="587"
                value={settings.smtpPort}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpUser">SMTP Username</Label>
            <Input
              id="smtpUser"
              name="smtpUser"
              placeholder="your@email.com"
              value={settings.smtpUser}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPass">SMTP Password</Label>
            <Input
              id="smtpPass"
              name="smtpPass"
              type="password"
              placeholder="App password or credentials"
              value={settings.smtpPass}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resendApiKey">Resend API Key (optional)</Label>
            <Input
              id="resendApiKey"
              name="resendApiKey"
              type="password"
              placeholder="re_..."
              value={settings.resendApiKey}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Resend.com for transactional emails
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>General Settings</CardTitle>
          </div>
          <CardDescription>
            System-wide preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              name="companyName"
              placeholder="Your company name"
              value={settings.companyName}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultWeightUnit">Default Weight Unit</Label>
              <Select
                value={settings.defaultWeightUnit}
                onValueChange={(v) => handleSelectChange("defaultWeightUnit", v)}
              >
                <SelectTrigger id="defaultWeightUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDimensionUnit">Default Dimension Unit</Label>
              <Select
                value={settings.defaultDimensionUnit}
                onValueChange={(v) => handleSelectChange("defaultDimensionUnit", v)}
              >
                <SelectTrigger id="defaultDimensionUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="in">Inches (in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} className="gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
