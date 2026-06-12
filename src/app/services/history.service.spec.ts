import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { HistoryService } from "./history.service";
import { environment } from "../../environments/environment";

describe("HistoryService", () => {
  let service: HistoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HistoryService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(HistoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("calls /api/history/me with pagination and sort params", () => {
    service.getMyHistory(2, 15, "eventStartDate,desc").subscribe();

    const request = httpMock.expectOne((req) => req.url === `${environment.apiBaseUrl}/history/me`);
    expect(request.request.method).toBe("GET");
    expect(request.request.params.get("page")).toBe("2");
    expect(request.request.params.get("size")).toBe("15");
    expect(request.request.params.get("sort")).toBe("eventStartDate,desc");

    request.flush({
      content: [],
      totalPages: 0,
      totalElements: 0,
      number: 2,
      size: 15,
    });
  });
});
