package models

import (
	"time"

	"gorm.io/gorm"
)

type Comment struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	PostID    uint           `gorm:"not null;index" json:"postId"`
	Post      Post           `gorm:"foreignKey:PostID" json:"-"`
	AuthorID  uint           `gorm:"not null;index" json:"authorId"`
	Author    User           `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	ParentID  *uint          `gorm:"index" json:"parentId"`
	Parent    *Comment       `gorm:"foreignKey:ParentID" json:"-"`
	Children  []Comment      `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Status    string         `gorm:"size:20;default:approved" json:"status"` // approved, pending, rejected
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
