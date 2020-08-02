import org.testng.Assert;
import org.testng.annotations.Test;

public class TestConverter {
    ConverterToText converter = new ConverterToText();
    @Test
            public void minusTest (){
    String text = converter.convert(-2);
        Assert.assertEquals(text,"минус два");

}@Test
            public void to10Test (){
    String text = converter.convert(5);
        Assert.assertEquals(text,"пять");

}@Test
            public void to100Test (){
    String text = converter.convert(55);
        Assert.assertEquals(text,"пятьдесят пять");

}@Test
            public void to1000Test (){
    String text = converter.convert(555);
        Assert.assertEquals(text,"пятьсот пятьдесят пять");

}@Test
            public void to10_000Test (){
    String text = converter.convert(5555);
        Assert.assertEquals(text,"пять тысяч пятьсот пятьдесят пять");

}@Test
            public void to10_0000Test (){
    String text = converter.convert(55555);
        Assert.assertEquals(text,"пятьдесят пять тысяч пятьсот пятьдесят пять");

}@Test
            public void to1_000_000Test (){
    String text = converter.convert(555555);
        Assert.assertEquals(text,"пятьсот пятьдесят пять тысяч пятьсот пятьдесят пять");

}@Test
            public void to10_000_000Test () {
        String text = converter.convert(5555555);
        Assert.assertEquals(text, "пять миллионов пятьсот пятьдесят пять тысяч пятьсот пятьдесят пять");
    }
@Test
            public void to100_000_000Test (){
    String text = converter.convert(55555555);
        Assert.assertEquals(text,"пятьдесят пять миллионов пятьсот пятьдесят пять тысяч пятьсот пятьдесят пять");

}@Test
            public void to1_000_000_000Test (){
    String text = converter.convert(1000000000);
        Assert.assertEquals(text,"один миллиард");

}}
