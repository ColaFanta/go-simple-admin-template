package model

import (
	"gorm.io/gorm"
)

type Product struct {
	gorm.Model

	Name        string `gorm:"not null"`
	Description string `gorm:"not null"`
	Brand       string `gorm:"not null"`
	Category    string `gorm:"not null"`
	Skus        []Sku  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	Q string `gorm:"type:tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(category, ''))) STORED;index:,type:GIN;default:(-);->"`
}

type Sku struct {
	gorm.Model

	SkuCode string

	ProductID uint `gorm:"not null"`
	Product   Product

	SkuSpecPhone *SkuSpecPhone
	SkuSpecPc    *SkuSpecPc

	Prices      []SkuPrice  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Inventories []Inventory `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

// SkuSpec represents a variant detail of a product SKU, it is a base class, don't use it directly.
type SkuSpec struct {
	gorm.Model

	SkuID uint `gorm:"not null"`
	Sku   Sku  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	// In cents
	BasePrice uint64 `gorm:"not null"`
	Currency  string `gorm:"not null"`
}

type SkuPrice struct {
	gorm.Model

	SkuID uint `gorm:"not null"`
	Sku   Sku

	// In cents
	Price    uint64 `gorm:"not null"`
	Currency string `gorm:"not null"`
}

type Inventory struct {
	gorm.Model

	Warehouse string `gorm:"not null;index:uniqueIndex"`

	SkuID uint `gorm:"not null"`
	Sku   Sku

	Quantity uint64 `gorm:"not null;default:0"`
}
