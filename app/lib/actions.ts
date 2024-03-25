'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  customerId: z.string(),
  amount: 
    z.coerce
      .number()
      .gt(0, {
        message: 'Please enter an amount greater than $0.'
      }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

// This is temporary until @types/react-dom is updated
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export const createInvoice = async (prevState: State, formData: FormData) => {

  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  // const rawFormData = Object.fromEntries(formData.entries())
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    return {
      message: 'Failed to create invoice.',
      error: error
    }
  }
  // Request new cache
  revalidatePath('/dashboard/invoices');
  // Like useNavigate() redirect user to the invoice page with the new data
  redirect('/dashboard/invoices');
};

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
export const updateInvoice = async(id: string, prevState: State, formData: FormData) => {

  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
  
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
 
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `; 
  } catch (error) {
    return {
      message: 'Failed to update invoice.',
      error: error
    }
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export const deleteInvoice = async (id: string) => {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;    
  } catch (error) {
    return {
      message: 'Failed to delete invoice.',
      error: error
    }
  }
  revalidatePath('/dashboard/invoices');
}