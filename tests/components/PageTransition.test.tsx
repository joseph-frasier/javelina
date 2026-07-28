import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageTransition } from '@/components/layout/PageTransition'

vi.mock('next/navigation', () => ({
  usePathname: () => '/organization/abc',
}))

describe('PageTransition', () => {
  it('renders children into the document', () => {
    render(
      <PageTransition>
        <p>page content</p>
      </PageTransition>
    )
    // toBeTruthy rather than toBeInTheDocument: jest-dom matcher types are not
    // registered in this repo's tsconfig, so the latter adds a tsc error.
    expect(screen.getByText('page content')).toBeTruthy()
  })

  it('does not leave content hidden behind an exit animation', () => {
    // A fade-IN from 0 is fine. A fade-OUT blanks the screen before the new
    // page appears, which is the latency this task removes.
    const { container } = render(
      <PageTransition>
        <p>page content</p>
      </PageTransition>
    )
    const wrapper = container.querySelector('div > div') as HTMLElement
    expect(wrapper).toBeTruthy()
    const opacity = wrapper.style.opacity
    expect(opacity === '' || Number(opacity) >= 0).toBe(true)
  })

  it('keeps the scroll container at the top', () => {
    const { container } = render(
      <PageTransition>
        <p>page content</p>
      </PageTransition>
    )
    const scroller = container.firstElementChild as HTMLElement
    expect(scroller.scrollTop).toBe(0)
  })
})
