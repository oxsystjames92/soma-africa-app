import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { DomainErrorFilter } from "./common/domain-error.filter.js";
import { LoggingInterceptor } from "./common/logging.interceptor.js";
import { IdentityModule } from "./identity/identity.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { ParentModule } from "./parent/parent.module.js";
import { SchoolsModule } from "./schools/schools.module.js";

@Module({
  imports: [IdentityModule, PaymentsModule, SchoolsModule, ParentModule],
  providers: [
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
