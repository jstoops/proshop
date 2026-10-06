import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import AdminRoute from './AdminRoute';
import CheckoutSteps from './CheckoutSteps';
import Footer from './Footer';
import FormContainer from './FormContainer';
import Loader from './Loader';
import Message from './Message';
import Meta from './Meta';
import Paginate from './Paginate';
import PrivateRoute from './PrivateRoute';
import Product from './Product';
import Rating from './Rating';
import SearchBox from './SearchBox';
import { makeStore } from '../testUtils';

function starMarkup(value) {
  const { container } = render(<Rating value={value} />);
  return [...container.querySelectorAll('.rating span svg')].map(
    (svg) => svg.innerHTML
  );
}

describe('Rating', () => {
  test('renders empty, half, and full stars', () => {
    const empty = starMarkup(0);
    const full = starMarkup(5);
    const halfFirst = starMarkup(0.5);
    const mixed = starMarkup(3.5);
    const almostFull = starMarkup(4.5);

    expect(empty).toHaveLength(5);
    expect(new Set(empty).size).toBe(1);
    expect(new Set(full).size).toBe(1);
    expect(full[0]).not.toBe(empty[0]);
    expect(halfFirst[0]).not.toBe(full[0]);
    expect(halfFirst[0]).not.toBe(empty[0]);
    expect(halfFirst.slice(1)).toEqual(empty.slice(1));
    expect(mixed.slice(0, 3)).toEqual(full.slice(0, 3));
    expect(mixed[3]).toBe(halfFirst[0]);
    expect(mixed[4]).toBe(empty[0]);
    expect(almostFull.slice(0, 4)).toEqual(full.slice(0, 4));
    expect(almostFull[4]).toBe(halfFirst[0]);
  });

  test('shows the review text only when it is provided', () => {
    const { rerender } = render(<Rating value={4} text="12 reviews" />);
    expect(screen.getByText('12 reviews')).toBeInTheDocument();

    rerender(<Rating value={4} />);
    expect(screen.queryByText('12 reviews')).not.toBeInTheDocument();
  });
});

describe('Message', () => {
  test('defaults to an info alert and accepts another variant', () => {
    const { rerender } = render(<Message>Saved</Message>);
    expect(screen.getByRole('alert')).toHaveClass('alert-info');
    expect(screen.getByText('Saved')).toBeInTheDocument();

    rerender(<Message variant="danger">Failed</Message>);
    expect(screen.getByRole('alert')).toHaveClass('alert-danger');
  });
});

describe('Loader', () => {
  test('renders a centered status spinner', () => {
    render(<Loader />);
    expect(screen.getByRole('status')).toHaveStyle({
      width: '100px',
      height: '100px',
      display: 'block',
    });
  });
});

describe('FormContainer', () => {
  test('renders its children', () => {
    render(
      <FormContainer>
        <p>Form body</p>
      </FormContainer>
    );
    expect(screen.getByText('Form body')).toBeInTheDocument();
  });
});

describe('Footer', () => {
  test('shows the current year', () => {
    render(<Footer />);
    expect(
      screen.getByText(`JDSCraft © ${new Date().getFullYear()}`)
    ).toBeInTheDocument();
  });
});

describe('Meta', () => {
  beforeEach(() => {
    document.title = '';
  });

  async function renderMeta(props, title) {
    render(
      <HelmetProvider>
        <Meta {...props} />
      </HelmetProvider>
    );
    await waitFor(() => {
      expect(document.title).toBe(title);
    });
  }

  test('uses the default shop title and meta tags', async () => {
    await renderMeta(undefined, 'Welcome To ProShop');

    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'We sell the best products for cheap'
    );
    expect(document.querySelector('meta[name="keyword"]')).toHaveAttribute(
      'content',
      'electronics, buy electronics, cheap electroincs'
    );
  });

  test('overrides the document head from props', async () => {
    await renderMeta(
      {
        title: 'Phone',
        description: 'A phone',
        keywords: 'phone, mobile',
      },
      'Phone'
    );

    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'A phone'
    );
    expect(document.querySelector('meta[name="keyword"]')).toHaveAttribute(
      'content',
      'phone, mobile'
    );
  });
});

describe('Product', () => {
  test('links to the product and shows its rating and price', () => {
    render(
      <MemoryRouter>
        <Product
          product={{
            _id: 'p1',
            name: 'Phone',
            image: '/images/phone.jpg',
            rating: 4,
            numReviews: 8,
            price: 599.99,
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/product/p1');
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('8 reviews')).toBeInTheDocument();
    expect(screen.getByText('$599.99')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/phone.jpg');
  });
});

describe('Paginate', () => {
  function renderPaginate(props) {
    render(
      <MemoryRouter>
        <Paginate {...props} />
      </MemoryRouter>
    );
  }

  test('renders nothing when there is only one page', () => {
    const { container } = render(
      <MemoryRouter>
        <Paginate pages={1} page={1} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('links shoppers through search results and plain pages', () => {
    const { rerender } = render(
      <MemoryRouter>
        <Paginate pages={3} page={2} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/page/1');
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/page/3');
    expect(screen.getByText('(current)').closest('.page-item')).toHaveClass('active');
    expect(screen.getByText('(current)').closest('.page-item')).toHaveTextContent('2');

    rerender(
      <MemoryRouter>
        <Paginate pages={2} page={1} keyword="phone" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/search/phone/page/2'
    );
  });

  test('links admins to the product list pages', () => {
    renderPaginate({ pages: 2, page: 1, isAdmin: true, keyword: 'ignored' });
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/admin/productlist/2'
    );
    expect(screen.getByText('(current)').closest('.page-item')).toHaveTextContent('1');
  });
});

describe('CheckoutSteps', () => {
  test('enables only the steps that have been reached', () => {
    const { rerender } = render(<CheckoutSteps />);

    expect(screen.getByText('Sign In').closest('a')).toHaveClass('disabled');
    expect(screen.getByText('Shipping').closest('a')).toHaveClass('disabled');
    expect(screen.getByText('Payment').closest('a')).toHaveClass('disabled');
    expect(screen.getByText('Place Order').closest('a')).toHaveClass('disabled');

    rerender(
      <MemoryRouter>
        <CheckoutSteps step1 step2 step3 step4 />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('link', { name: 'Shipping' })).toHaveAttribute(
      'href',
      '/shipping'
    );
    expect(screen.getByRole('link', { name: 'Payment' })).toHaveAttribute(
      'href',
      '/payment'
    );
    expect(screen.getByRole('link', { name: 'Place Order' })).toHaveAttribute(
      'href',
      '/placeorder'
    );
  });
});

describe('SearchBox', () => {
  function Location() {
    const location = useLocation();
    return <div data-testid="loc">{`${location.pathname}${location.search}`}</div>;
  }

  test('fills the field from the keyword in the url', () => {
    render(
      <MemoryRouter initialEntries={['/search/phone']}>
        <Routes>
          <Route path="/search/:keyword" element={<SearchBox />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Search Products...')).toHaveValue('phone');
  });

  test('navigates to a trimmed search', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Location />
                <SearchBox />
              </>
            }
          />
          <Route path="/search/:keyword" element={<Location />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Search Products...'), {
      target: { value: '  phone  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('loc')).toHaveTextContent('/search/phone');
  });

  test('returns home when the search is blank', () => {
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route
            path="/cart"
            element={
              <>
                <Location />
                <SearchBox />
              </>
            }
          />
          <Route path="/" element={<Location />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Search Products...'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('loc')).toHaveTextContent('/');
  });
});

function renderGuardedRoute(RouteComponent, userInfo) {
  const store = makeStore({
    auth: { userInfo },
    cart: { cartItems: [], shippingAddress: {}, paymentMethod: 'PayPal' },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route element={<RouteComponent />}>
            <Route path="/secret" element={<div>Secret</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('PrivateRoute', () => {
  test('shows the private page to a signed-in shopper', () => {
    renderGuardedRoute(PrivateRoute, { name: 'Jane', isAdmin: false });
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  test('sends anonymous visitors to login', () => {
    renderGuardedRoute(PrivateRoute, null);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  test('shows the page to an admin', () => {
    renderGuardedRoute(AdminRoute, { name: 'Ada', isAdmin: true });
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  test('sends shoppers and anonymous visitors to login', () => {
    renderGuardedRoute(AdminRoute, { name: 'Jane', isAdmin: false });
    expect(screen.getByText('Login page')).toBeInTheDocument();

    renderGuardedRoute(AdminRoute, null);
    expect(screen.getAllByText('Login page').length).toBeGreaterThan(0);
  });
});
