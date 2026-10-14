import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { AdminEnquiryListQueryDto, UpdateEnquiryDto } from './dto/enquiry.dto.js';
import { EnquiriesService } from './enquiries.service.js';

@Controller('admin/enquiries')
export class EnquiriesAdminController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  list(@Query() query: AdminEnquiryListQueryDto) {
    return this.enquiries.listAdmin(query);
  }

  @Get('counts')
  counts() {
    return this.enquiries.counts();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEnquiryDto) {
    return this.enquiries.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enquiries.remove(id);
  }
}
