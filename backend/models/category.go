package models

import "time"

type Category struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:50;not null" json:"name"`
	Slug        string    `gorm:"uniqueIndex;size:50;not null" json:"slug"`
	Description string    `gorm:"size:500" json:"description"`
	PostCount   int       `gorm:"default:0" json:"postCount"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
