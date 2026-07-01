package fun.ylmz.blogspringboot;

import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BlogSpringbootApplication {

    public static void main(String[] args) {
        ensureDataDirExists();
        SpringApplication.run(BlogSpringbootApplication.class, args);
    }

    private static void ensureDataDirExists() {
        try {
            Files.createDirectories(Path.of("data", "uploads"));
        } catch (Exception e) {
            System.err.println("Failed to create data directory: " + e.getMessage());
        }
    }

}
