import {describe,it,expect} from 'vitest'
import {normalizarPreco} from '../bim-costs.service'
describe('preços digitados no orçamento 5D',()=>{
 it('preserva casas decimais sem converter preço em ponto flutuante',()=>{
  expect(normalizarPreco('125,50')).toBe('125.50')
  expect(normalizarPreco('1.234,5678')).toBe('1234.5678')
  expect(normalizarPreco('0,0001')).toBe('0.0001')
  expect(normalizarPreco('00125.50')).toBe('125.50')
 })
 it.each(['','-1','1e6','NaN','1,00001','100000000,00','1.2.3,45'])('recusa preço inválido %s antes de enviar',value=>{
  expect(()=>normalizarPreco(value)).toThrow()
 })
})
