package models

import "time"

type Tag struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:50;not null" json:"name"`
	Slug      string    `gorm:"uniqueIndex;size:50;not null" json:"slug"`
	PostCount int       `gorm:"default:0" json:"postCount"`
	CreatedAt time.Time `json:"createdAt"`
}

type PostTag struct {
	PostID uint `gorm:"primaryKey"`
	TagID  uint `gorm:"primaryKey"`
}
