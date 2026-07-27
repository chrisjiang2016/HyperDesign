import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrototypeSpikeController } from './prototype-spike.controller'
import { ZipParserService } from './zip-parser.service'

@Module({
  imports: [AuthModule],
  controllers: [PrototypeSpikeController],
  providers: [ZipParserService],
  exports: [ZipParserService],
})
export class UploadsModule {}
