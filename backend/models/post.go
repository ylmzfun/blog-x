package models

import (
	"time"

	"gorm.io/gorm"
)

type Post struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Title        string         `gorm:"size:200;not null" json:"title"`
	Slug         string         `gorm:"uniqueIndex;size:200;not null" json:"slug"`
	Content      string         `gorm:"type:text" json:"content"`
	Summary      string         `gorm:"size:500" json:"summary"`
	Cover        string         `gorm:"size:500" json:"cover"`
	AuthorID     uint           `gorm:"not null;index" json:"authorId"`
	Author       User           `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	CategoryID   *uint          `gorm:"index" json:"categoryId"`
	Category     *Category      `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Status       string         `gorm:"size:20;default:draft" json:"status"` // published, draft
	Pinned       bool           `gorm:"default:false" json:"pinned"`
	ViewCount    int            `gorm:"default:0" json:"viewCount"`
	CommentCount int            `gorm:"default:0" json:"commentCount"`
	PublishedAt  *time.Time     `json:"publishedAt"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	Tags         []Tag          `gorm:"many2many:post_tags;" json:"tags,omitempty"`
}
