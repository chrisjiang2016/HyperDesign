import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:5173'

  // Requests arrive through the Nginx Web container in every deployed
  // environment (see infra/docker-compose.yml), so req.ip must be read from
  // X-Forwarded-For rather than the socket peer address. Trusting only the
  // immediate hop (loopback) keeps this safe if the API is ever exposed
  // directly: a spoofed X-Forwarded-For from a non-adjacent client is not
  // trusted by Express's 'trust proxy' hop-count semantics.
  app.getHttpAdapter().getInstance().set('trust proxy', 1)
  app.setGlobalPrefix('api')
  app.use(helmet({ crossOriginResourcePolicy: false }))
  app.use(cookieParser())
  app.enableCors({ origin, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))

  await app.listen(Number(process.env.PORT ?? 3001))
}

void bootstrap()
