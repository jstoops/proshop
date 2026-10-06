import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCarousel from './ProductCarousel';
import { useGetTopProductsQuery } from '../slices/productsApiSlice';

jest.mock('../slices/productsApiSlice', () => ({
  useGetTopProductsQuery: jest.fn(),
}));

describe('ProductCarousel', () => {
  test('renders nothing while the top products are loading', () => {
    useGetTopProductsQuery.mockReturnValue({ isLoading: true });
    const { container } = render(
      <MemoryRouter>
        <ProductCarousel />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('shows the request error', () => {
    useGetTopProductsQuery.mockReturnValue({
      isLoading: false,
      error: { data: { message: 'Could not load products' } },
    });

    render(
      <MemoryRouter>
        <ProductCarousel />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load products');
  });

  test('falls back to the error string when the server sent no message', () => {
    useGetTopProductsQuery.mockReturnValue({
      isLoading: false,
      error: { error: 'Network down' },
    });

    render(
      <MemoryRouter>
        <ProductCarousel />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
  });

  test('links each top product to its page', () => {
    useGetTopProductsQuery.mockReturnValue({
      isLoading: false,
      data: [
        { _id: 'p1', name: 'Phone', image: '/images/phone.jpg', price: 100 },
        { _id: 'p2', name: 'Camera', image: '/images/camera.jpg', price: 50 },
      ],
    });

    render(
      <MemoryRouter>
        <ProductCarousel />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: /phone/i })[0]).toHaveAttribute(
      'href',
      '/product/p1'
    );
    expect(screen.getAllByRole('img', { name: 'Camera' })[0]).toHaveAttribute(
      'src',
      '/images/camera.jpg'
    );
    expect(screen.getAllByText(/\$50/)[0]).toBeInTheDocument();
  });
});
