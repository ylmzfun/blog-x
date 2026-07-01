package fun.ylmz.blogspringboot.model.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CommentVO {
    private Long id;
    private String content;
    private UserVO author;
    private Long parentId;
    private String status;
    private List<CommentVO> children;
    private LocalDateTime createdAt;
}
