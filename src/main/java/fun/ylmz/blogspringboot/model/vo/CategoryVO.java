package fun.ylmz.blogspringboot.model.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CategoryVO {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private int postCount;
    private LocalDateTime createdAt;
}
