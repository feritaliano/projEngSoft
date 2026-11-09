import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Min,
  MinLength,
  validate,
  ValidateNested,
  ValidationError,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  MAX_FIELD_ERRORS,
  requestValidationExceptionFactory,
  RequestValidationException,
  toFieldErrors,
} from './request-validation';

class AddressDto {
  @IsString()
  street: string;
}

class ItemDto {
  @IsInt()
  @Min(1)
  quantity: number;
}

class OrderDto {
  @IsString()
  @MinLength(3)
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

async function errorsOf(payload: object): Promise<ValidationError[]> {
  return validate(plainToInstance(OrderDto, payload));
}

describe('toFieldErrors (400 with the field, D52, audit of 09/11)', () => {
  it('names each top-level field, one entry per failed constraint', async () => {
    const errors = await errorsOf({
      name: 7,
      address: { street: 'Rua A' },
      items: [],
    });

    expect(toFieldErrors(errors)).toEqual([
      {
        field: 'name',
        message: 'name must be longer than or equal to 3 characters',
      },
      { field: 'name', message: 'name must be a string' },
    ]);
  });

  it('uses a dotted path for nested objects and array items', async () => {
    const errors = await errorsOf({
      name: 'Ana',
      address: { street: 1 },
      items: [{ quantity: 1 }, { quantity: 0 }],
    });

    expect(toFieldErrors(errors)).toEqual([
      { field: 'address.street', message: 'street must be a string' },
      {
        field: 'items.1.quantity',
        message: 'quantity must not be less than 1',
      },
    ]);
  });

  it('keeps an error without constraints or children, naming its field', () => {
    const error = Object.assign(new ValidationError(), { property: 'odd' });

    expect(toFieldErrors([error])).toEqual([
      { field: 'odd', message: 'odd is invalid' },
    ]);
  });

  it('caps errors[] so a body with thousands of unknown keys cannot blow up the 400', () => {
    const errors = Array.from({ length: 5_000 }, (_, index) =>
      Object.assign(new ValidationError(), {
        property: `k${index}`,
        constraints: {
          whitelistValidation: `property k${index} should not exist`,
        },
      }),
    );

    const exception = requestValidationExceptionFactory(errors);

    expect(exception.errors).toHaveLength(MAX_FIELD_ERRORS);
    expect(exception.errors[0]).toEqual({
      field: 'k0',
      message: 'property k0 should not exist',
    });
  });

  it('builds the exception used by the global ValidationPipe', async () => {
    const exception = requestValidationExceptionFactory(
      await errorsOf({ name: 'Ana', address: {}, items: [] }),
    );

    expect(exception).toBeInstanceOf(RequestValidationException);
    expect(exception.getStatus()).toBe(400);
    expect(exception.errors).toEqual([
      { field: 'address.street', message: 'street must be a string' },
    ]);
  });
});
