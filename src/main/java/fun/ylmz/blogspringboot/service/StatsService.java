package fun.ylmz.blogspringboot.service;

import fun.ylmz.blogspringboot.model.vo.StatsOverviewVO;
import fun.ylmz.blogspringboot.repository.CommentRepository;
import fun.ylmz.blogspringboot.repository.PostRepository;
import fun.ylmz.blogspringboot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    public StatsOverviewVO overview() {
        return StatsOverviewVO.builder()
                .postCount(postRepository.countByDeletedAtIsNull())
                .commentCount(commentRepository.countByDeletedAtIsNull())
                .userCount(userRepository.count())
                .todayPV(0)  // Simplified: no tracking table
                .todayUV(0)
                .build();
    }
}
