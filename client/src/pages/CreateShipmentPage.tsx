import { useState } from "react"
import { Link, useLocation } from "wouter"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { generateTrackingNumber } from "@/lib/utils"

export function CreateShipmentPage() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    senderName: "",
    senderAddress: "",
    senderPhone: "",
    senderEmail: "",
    receiverName: "",
    receiverAddress: "",
    receiverPhone: "",
    receiverEmail: "",
    weight: "",
    weightUnit: "kg",
    length: "",
    width: "",
    height: "",
    dimensionUnit: "cm",
    description: "",
    estimatedDelivery: "",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      const requiredFields = [
        "senderName",
        "senderAddress",
        "receiverName",
        "receiverAddress",
        "weight",
      ]

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          throw new Error(`${field.replace(/([A-Z])/g, " $1").trim()} is required`)
        }
      }

      // Validate weight is a number
      if (isNaN(Number(formData.weight))) {
        throw new Error("Weight must be a valid number")
      }

      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          weight: Number(formData.weight),
          dimensions: formData.length && formData.width && formData.height ? {
            length: Number(formData.length),
            width: Number(formData.width),
            height: Number(formData.height),
            unit: formData.dimensionUnit,
          } : null,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Failed to create shipment")
      }

      const shipment = await response.json()

      toast({
        title: "Shipment created!",
        description: `Tracking number: ${shipment.trackingNumber}`,
      })

      setLocation(`/track/${shipment.trackingNumber}`)
    } catch (error) {
      toast({
        title: "Failed to create shipment",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/shipments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Shipment</h1>
          <p className="text-muted-foreground">Register a new consignment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sender Information */}
          <Card>
            <CardHeader>
              <CardTitle>Sender Information</CardTitle>
              <CardDescription>Who is sending this package?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senderName">Full Name *</Label>
                <Input
                  id="senderName"
                  name="senderName"
                  placeholder="Company or person name"
                  value={formData.senderName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderAddress">Address *</Label>
                <Textarea
                  id="senderAddress"
                  name="senderAddress"
                  placeholder="Street address, city, state, ZIP"
                  value={formData.senderAddress}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senderPhone">Phone</Label>
                  <Input
                    id="senderPhone"
                    name="senderPhone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.senderPhone}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Email</Label>
                  <Input
                    id="senderEmail"
                    name="senderEmail"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.senderEmail}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receiver Information */}
          <Card>
            <CardHeader>
              <CardTitle>Receiver Information</CardTitle>
              <CardDescription>Who is receiving this package?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiverName">Full Name *</Label>
                <Input
                  id="receiverName"
                  name="receiverName"
                  placeholder="Company or person name"
                  value={formData.receiverName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiverAddress">Address *</Label>
                <Textarea
                  id="receiverAddress"
                  name="receiverAddress"
                  placeholder="Street address, city, state, ZIP"
                  value={formData.receiverAddress}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="receiverPhone">Phone</Label>
                  <Input
                    id="receiverPhone"
                    name="receiverPhone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.receiverPhone}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiverEmail">Email</Label>
                  <Input
                    id="receiverEmail"
                    name="receiverEmail"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.receiverEmail}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Details */}
          <Card>
            <CardHeader>
              <CardTitle>Package Details</CardTitle>
              <CardDescription>Weight and dimensions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight *</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.weight}
                    onChange={handleChange}
                    required
                  />
                </div>
                <Select
                  value={formData.weightUnit}
                  onValueChange={(v) => handleSelectChange("weightUnit", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dimensions (optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    name="length"
                    placeholder="L"
                    value={formData.length}
                    onChange={handleChange}
                  />
                  <Input
                    name="width"
                    placeholder="W"
                    value={formData.width}
                    onChange={handleChange}
                  />
                  <Input
                    name="height"
                    placeholder="H"
                    value={formData.height}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <Select
                value={formData.dimensionUnit}
                onValueChange={(v) => handleSelectChange("dimensionUnit", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="in">Inches (in)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Delivery and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Package Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="What's inside the package?"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedDelivery">Estimated Delivery Date</Label>
                <Input
                  id="estimatedDelivery"
                  name="estimatedDelivery"
                  type="date"
                  value={formData.estimatedDelivery}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/shipments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Shipment"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
