package fun.ylmz.blogspringboot.model.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserVO {
    private Long id;
    private String username;
    private String email;
    private String avatar;
    private String bio;
    private String website;
    private String role;
    private boolean emailVerified;
    private LocalDateTime createdAt;
}
