package model

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Admin struct {
	gorm.Model

	AccountSub uuid.UUID `gorm:"type:uuid;uniqueIndex;not null"`
	Account    Account   `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	Role string `gorm:"not null;default:'role::root'"`
}
