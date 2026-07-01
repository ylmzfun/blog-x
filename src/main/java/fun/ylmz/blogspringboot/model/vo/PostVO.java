package fun.ylmz.blogspringboot.model.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PostVO {
    private Long id;
    private String title;
    private String slug;
    private String content;
    private String summary;
    private String cover;
    private UserVO author;
    private CategoryVO category;
    private List<TagVO> tags;
    private String status;
    private boolean pinned;
    private int viewCount;
    private int commentCount;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
