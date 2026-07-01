package models

import "time"

type User struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	Username      string     `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Email         string     `gorm:"uniqueIndex;size:100;not null" json:"email"`
	PasswordHash  string     `gorm:"not null" json:"-"`
	Avatar        string     `gorm:"size:500" json:"avatar"`
	Bio           string     `gorm:"size:500" json:"bio"`
	Website       string     `gorm:"size:200" json:"website"`
	Role          string     `gorm:"size:20;default:user" json:"role"` // admin, author, user
	EmailVerified bool       `gorm:"default:false" json:"emailVerified"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	RefreshToken  string     `gorm:"size:500" json:"-"`
}
