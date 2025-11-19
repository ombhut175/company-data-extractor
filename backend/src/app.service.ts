import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  public getHello(): string {
    this.logger.log("Generating hello message");
    return "Hello World!";
  }
}
