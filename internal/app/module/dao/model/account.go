package model

import (
	"github.com/google/uuid"
)

//go:generate go tool go-enum --sql

// ENUM(wechat, douyin, alipay, apple, google)
type SocialProvider string

type Account struct {
	Sub                 uuid.UUID `gorm:"type:uuid;primaryKey;default:uuidv7()"`
	PreferredUsername   *string   `gorm:"uniqueIndex"`
	Password            *string
	Email               *string
	EmailVerified       *bool `gorm:"not null;default:false"`
	PhoneNumber         *string
	PhoneNumberVerified *bool           `gorm:"not null;default:false"`
	SocialAccounts      []SocialAccount `gorm:"foreignKey:LocalSub;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Customer            *Customer
	Admin               *Admin
	CrudTimes
	Q string `gorm:"type:tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(preferred_username, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone_number, ''))) STORED;index:,type:GIN;default:(-);->"`
}

type SocialAccount struct {
	Provider   SocialProvider `gorm:"primaryKey"`
	LocalSub   uuid.UUID      `gorm:"primaryKey"`
	ForeignSub string         `gorm:"index;not null"`
	Account    Account        `gorm:"foreignKey:LocalSub"`
	CrudTimes
}
