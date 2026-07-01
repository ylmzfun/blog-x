package fun.ylmz.blogspringboot.service;

import fun.ylmz.blogspringboot.model.entity.Post;
import fun.ylmz.blogspringboot.model.vo.SearchResultVO;
import fun.ylmz.blogspringboot.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final PostRepository postRepository;

    public Page<SearchResultVO> search(String keyword, int page, int pageSize) {
        Page<Post> posts = postRepository.searchByKeyword(keyword, PageRequest.of(page - 1, pageSize));
        return posts.map(post -> {
            String highlight = post.getTitle().replace(keyword,
                    "<em>" + keyword + "</em>");
            return SearchResultVO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .slug(post.getSlug())
                    .summary(post.getSummary())
                    .highlight(highlight)
                    .build();
        });
    }

    public List<String> suggestions(String keyword) {
        return postRepository.searchByKeyword(keyword, PageRequest.of(0, 5))
                .stream()
                .map(Post::getTitle)
                .collect(Collectors.toList());
    }
}
