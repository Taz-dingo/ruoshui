import type {
  CreatePlaceInput,
  ListPlacesInput,
  Place,
  UpdatePlaceInput,
} from "@ruoshui/shared";

interface PlaceRepository {
  createPlace(input: CreatePlaceInput, now: Date): Promise<Place>;
  getPlace(placeId: string): Promise<Place | null>;
  listPlaces(input: ListPlacesInput): Promise<Place[]>;
  updatePlace(placeId: string, input: UpdatePlaceInput, now: Date): Promise<Place | null>;
}

interface PlaceService {
  createPlace(input: CreatePlaceInput): Promise<Place>;
  getPlace(placeId: string): Promise<Place>;
  listPlaces(input: ListPlacesInput): Promise<Place[]>;
  updatePlace(placeId: string, input: UpdatePlaceInput): Promise<Place>;
}

class PlaceServiceError extends Error {
  readonly status = 404 as const;

  constructor(message = "Place not found.") {
    super(message);
    this.name = "PlaceServiceError";
  }
}

interface CreatePlaceServiceOptions {
  now?: () => Date;
  repository: PlaceRepository;
}

function createPlaceService(options: CreatePlaceServiceOptions): PlaceService {
  const now = options.now ?? (() => new Date());

  return {
    async createPlace(input) {
      return options.repository.createPlace(input, now());
    },

    async getPlace(placeId) {
      const place = await options.repository.getPlace(placeId);
      if (!place) {
        throw new PlaceServiceError();
      }
      return place;
    },

    async listPlaces(input) {
      return options.repository.listPlaces(input);
    },

    async updatePlace(placeId, input) {
      const place = await options.repository.updatePlace(placeId, input, now());
      if (!place) {
        throw new PlaceServiceError();
      }
      return place;
    },
  };
}

export { PlaceServiceError, createPlaceService };
export type { CreatePlaceServiceOptions, PlaceRepository, PlaceService };
