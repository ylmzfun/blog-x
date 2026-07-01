package models

import (
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(path string) {
	var err error
	DB, err = gorm.Open(sqlite.Open(path), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	err = DB.AutoMigrate(
		&User{},
		&Post{},
		&Category{},
		&Tag{},
		&PostTag{},
		&Comment{},
	)
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}
}
