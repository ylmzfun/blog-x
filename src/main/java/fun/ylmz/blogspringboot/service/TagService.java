package fun.ylmz.blogspringboot.service;

import fun.ylmz.blogspringboot.common.BusinessException;
import fun.ylmz.blogspringboot.model.dto.CreateTagRequest;
import fun.ylmz.blogspringboot.model.entity.Tag;
import fun.ylmz.blogspringboot.model.vo.TagVO;
import fun.ylmz.blogspringboot.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    public List<TagVO> list() {
        return tagRepository.findAll().stream()
                .map(this::toVO).collect(Collectors.toList());
    }

    @Transactional
    public TagVO create(CreateTagRequest request) {
        if (tagRepository.existsBySlug(request.getSlug())) {
            throw new BusinessException(400, "Slug 已存在");
        }
        Tag tag = new Tag();
        tag.setName(request.getName());
        tag.setSlug(request.getSlug());
        return toVO(tagRepository.save(tag));
    }

    @Transactional
    public void delete(Long id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "标签不存在"));
        if (tag.getPostCount() > 0) {
            throw new BusinessException(400, "该标签下还有文章，无法删除");
        }
        tagRepository.delete(tag);
    }

    public TagVO toVO(Tag tag) {
        return TagVO.builder()
                .id(tag.getId())
                .name(tag.getName())
                .slug(tag.getSlug())
                .postCount(tag.getPostCount())
                .createdAt(tag.getCreatedAt())
                .build();
    }
}
