import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Length,
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
  UnmappedConstraintError,
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

class SignUpDto {
  @Length(8, 128)
  password: string;
}

class BoundedDto {
  @IsInt()
  @Min(0)
  count: number;
}

async function errorsOf(payload: object): Promise<ValidationError[]> {
  return validate(plainToInstance(OrderDto, payload));
}

describe('toFieldErrors (400 with the field, D52, audit of 09/11)', () => {
  it('names each top-level field with one entry, the first constraint by priority (D56)', async () => {
    const errors = await errorsOf({
      name: 7,
      address: { street: 'Rua A' },
      items: [],
    });

    expect(toFieldErrors(errors)).toEqual([
      {
        field: 'name',
        code: 'INVALID_FORMAT',
        message: 'name must be a string',
      },
    ]);
  });

  it('reads the limit of the decorator into params (D56)', async () => {
    const tooShort = await errorsOf({
      name: 'An',
      address: { street: 'Rua A' },
      items: [],
    });
    const tooLong = await validate(
      plainToInstance(SignUpDto, { password: 'x'.repeat(129) }),
    );

    expect(toFieldErrors(tooShort)).toEqual([
      {
        field: 'name',
        code: 'TOO_SHORT',
        message: 'name must be longer than or equal to 3 characters',
        params: { min: 3 },
      },
    ]);
    expect(toFieldErrors(tooLong)).toEqual([
      {
        field: 'password',
        code: 'TOO_LONG',
        message: 'password must be shorter than or equal to 128 characters',
        params: { max: 128 },
      },
    ]);
  });

  it('counts the length like the decorator: 4 emoji are TOO_SHORT, not TOO_LONG (D56)', async () => {
    // 4 characters for class-validator, 8 UTF-16 units for String.length.
    const errors = await validate(
      plainToInstance(SignUpDto, { password: '😀😀😀😀' }),
    );

    expect(toFieldErrors(errors)).toEqual([
      expect.objectContaining({ code: 'TOO_SHORT', params: { min: 8 } }),
    ]);
  });

  it('answers REQUIRED for a missing value, with the minimum length when above 1 (D56)', async () => {
    const errors = await validate(plainToInstance(SignUpDto, {}));

    expect(toFieldErrors(errors)).toEqual([
      {
        field: 'password',
        code: 'REQUIRED',
        message: 'password is required',
        params: { min: 8 },
      },
    ]);
  });

  it('uses a dotted path for nested objects and array items', async () => {
    const errors = await errorsOf({
      name: 'Ana',
      address: { street: 1 },
      items: [{ quantity: 1 }, { quantity: 0 }],
    });

    expect(toFieldErrors(errors)).toEqual([
      {
        field: 'address.street',
        code: 'INVALID_FORMAT',
        message: 'street must be a string',
      },
      {
        field: 'items.1.quantity',
        code: 'NOT_POSITIVE',
        message: 'quantity must not be less than 1',
      },
    ]);
  });

  it('fails loudly on an error without constraints or children (D56)', () => {
    const error = Object.assign(new ValidationError(), { property: 'odd' });

    expect(() => toFieldErrors([error])).toThrow(UnmappedConstraintError);
  });

  it('fails loudly on a constraint without a code, never a generic one (D56)', () => {
    const error = Object.assign(new ValidationError(), {
      property: 'name',
      value: 'Ana',
      target: {},
      constraints: { isOdd: 'name must be odd' },
    });

    expect(() => toFieldErrors([error])).toThrow(
      'Constraint "isOdd" has no field error code (D56)',
    );
  });

  it('fails loudly on a lower bound other than Min(1), which has no code yet (D56)', async () => {
    const errors = await validate(plainToInstance(BoundedDto, { count: -1 }));

    expect(() => toFieldErrors(errors)).toThrow(UnmappedConstraintError);
  });

  it('fails loudly when the error comes without its target (ValidationPipe default)', async () => {
    const errors = await validate(
      plainToInstance(SignUpDto, { password: 'x' }),
      {
        validationError: { target: false },
      },
    );

    expect(() => toFieldErrors(errors)).toThrow(
      'Constraint "isLength" was reported without its target class',
    );
  });

  it('caps errors[] so a body with thousands of unknown keys cannot blow up the 400', () => {
    const errors = Array.from({ length: 5_000 }, (_, index) =>
      Object.assign(new ValidationError(), {
        property: `k${index}`,
        target: {},
        constraints: {
          whitelistValidation: `property k${index} should not exist`,
        },
      }),
    );

    const exception = requestValidationExceptionFactory(errors);

    expect(exception.errors).toHaveLength(MAX_FIELD_ERRORS);
    expect(exception.errors[0]).toEqual({
      field: 'k0',
      code: 'INVALID_VALUE',
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
      {
        field: 'address.street',
        code: 'REQUIRED',
        message: 'address.street is required',
      },
    ]);
  });
});
