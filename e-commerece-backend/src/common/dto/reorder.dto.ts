import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

// The ids in their new display order; position becomes sortOrder.
export class ReorderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  ids: string[];
}
