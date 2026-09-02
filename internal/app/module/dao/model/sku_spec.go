package model

type SkuSpecPhone struct {
	SkuSpec

	Processor string `gorm:"not null"`
	Storage   uint   `gorm:"not null"`
	Color     string `gorm:"not null"`
	Size      string `gorm:"not null"`
	Camera    string `gorm:"not null"`
}

type SkuSpecPc struct {
	SkuSpec

	Processor string `gorm:"not null"`
	Ram       uint   `gorm:"not null"`
	Storage   uint   `gorm:"not null"`
}
