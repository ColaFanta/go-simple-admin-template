package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

//go:generate go tool go-enum --sql

// ENUM(active, inactive, suspended, banned, deletion_requested)
type CustomerStatus string

// ENUM(male, female, other, undisclosed)
type Gender string

type Customer struct {
	gorm.Model

	AccountSub uuid.UUID `gorm:"type:uuid;uniqueIndex;not null"`
	Account    Account   `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	FirstName   string `gorm:"not null"`
	LastName    string `gorm:"not null"`
	DateOfBirth *time.Time
	Gender      Gender         `gorm:"not null;default:'undisclosed'"`
	Status      CustomerStatus `gorm:"not null;default:'active'"`
}
