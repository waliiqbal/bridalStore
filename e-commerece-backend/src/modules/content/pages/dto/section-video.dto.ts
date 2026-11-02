import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsImageUrl, IsUploadedUrl, SAFE_LINK } from '../../../../common/validation.js';

// One video inside a Banner video or Trending videos block
export class SectionVideoDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string | null;

  @IsString()
  @MaxLength(2000)
  @IsUploadedUrl()
  videoUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsImageUrl()
  posterUrl?: string | null;

  // A page the video opens when clicked (empty = it does not link anywhere)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(new RegExp(`^$|${SAFE_LINK.source}`, 'i'), {
    message: 'linkUrl must be a site path like /pages/about, or a full http(s) link',
  })
  linkUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
