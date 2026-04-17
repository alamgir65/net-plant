import Card from './Card'
import Container from '../Shared/Container'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const Plants = () => {


  const {data : plants=[], isLoading, isError} = useQuery({
    queryKey: ['plants'],
    queryFn: async()  => {
      const {data} = await axios.get(`${import.meta.env.VITE_API_URL}/plants`);
      return data;
    }
  })


  return (
    <Container>
      <div className='pt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8'>
        {
          plants.map(plant => <Card plant={plant}></Card>)
        }
        <Card />
      </div>
    </Container>
  )
}

export default Plants
