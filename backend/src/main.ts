import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:5173'

  app.setGlobalPrefix('api')
  app.use(helmet({ crossOriginResourcePolicy: false }))
  app.use(cookieParser())
  app.enableCors({ origin, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))

  await app.listen(Number(process.env.PORT ?? 3001))
}

void bootstrap()
